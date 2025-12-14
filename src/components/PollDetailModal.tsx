import { useState, useEffect } from 'react';
import { api, type Poll, type Comment } from '../lib/api';
import { X, MessageCircle, Send, CheckCircle2, Trash2 } from 'lucide-react';

interface PollDetailModalProps {
    pollId: string | null;
    onClose: () => void;
    currentUserId?: string;
    canComment?: boolean;
    isAdmin?: boolean;
    onDelete?: () => void;
}

export default function PollDetailModal({ pollId, onClose, currentUserId, canComment = true, isAdmin = false, onDelete }: PollDetailModalProps) {
    const [poll, setPoll] = useState<Poll | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionResults, setMentionResults] = useState<any[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);

    useEffect(() => {
        if (pollId) {
            fetchPollDetails();
            fetchComments();
        }
    }, [pollId]);

    const fetchPollDetails = async () => {
        if (!pollId) return;
        const data = await api.fetchPollDetails(pollId);
        if (data) setPoll(data);
    };

    const fetchComments = async () => {
        if (!pollId) return;
        const data = await api.fetchPollComments(pollId);
        if (data) setComments(data);
    };

    // --- Comment Logic (Reused/Adapted) ---
    useEffect(() => {
        if (mentionQuery) {
            const search = async () => {
                const results = await api.searchProfiles(mentionQuery);
                if (results) setMentionResults(results);
            };
            search();
        } else {
            setMentionResults([]);
        }
    }, [mentionQuery]);

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const pos = e.target.selectionStart || 0;
        setNewComment(value);
        setCursorPosition(pos);

        const lastAt = value.lastIndexOf('@', pos - 1);
        if (lastAt !== -1) {
            const query = value.slice(lastAt + 1, pos);
            if (!query.includes(' ')) {
                setMentionQuery(query);
                setShowMentions(true);
                return;
            }
        }
        setShowMentions(false);
    };

    const insertMention = (userName: string) => {
        const lastAt = newComment.lastIndexOf('@', cursorPosition - 1);
        const before = newComment.slice(0, lastAt);
        const after = newComment.slice(cursorPosition);
        const newValue = `${before}@${userName} ${after}`;
        setNewComment(newValue);
        setShowMentions(false);
        setMentionQuery('');
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId || !pollId) return;

        setCommentLoading(true);
        try {
            const { error } = await api.createPollComment(
                pollId,
                currentUserId,
                newComment.trim(),
                replyTo?.id
            );

            if (error) throw error;
            setNewComment('');
            setReplyTo(null);
            fetchComments();
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setCommentLoading(false);
        }
    };

    const handleDeletePoll = async () => {
        if (!pollId) return;
        if (!confirm('Are you sure you want to delete this poll?')) return;

        try {
            await api.softDeletePoll(pollId);
            if (onDelete) onDelete();
            onClose();
        } catch (error) {
            console.error('Error deleting poll:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        setComments(prev => prev.map(c => {
            if (c.id !== commentId) return c;
            return { ...c, deleted_at: new Date().toISOString() };
        }));

        try {
            await api.softDeletePollComment(commentId);
        } catch (error) {
            console.error('Error deleting comment:', error);
            fetchComments();
        }
    };

    // --- Render Helpers ---
    const rootComments = comments.filter(c => !c.parent_id);
    const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

    const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
        const replies = getReplies(comment.id);
        const isDeleted = !!comment.deleted_at;
        const isAuthor = currentUserId === comment.user_id;
        const canDelete = isAuthor || isAdmin;

        const renderContent = (content: string) => {
            const parts = content.split(/(@\w+)/g);
            return parts.map((part, i) => {
                if (part.startsWith('@')) {
                    return <span key={i} className="text-indigo-600 font-bold">{part}</span>;
                }
                return part;
            });
        };

        return (
            <div className={`flex flex-col gap-2 ${depth > 0 ? 'ml-8 mt-2' : ''}`}>
                <div className="flex gap-3">
                    <img
                        src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user_id}`}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0"
                    />
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex-1 group">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {comment.profiles?.user_name || 'Neighbor'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                {new Date(comment.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                        </div>
                        {isDeleted ? (
                            <p className="text-sm text-gray-500 italic">deleted by user</p>
                        ) : (
                            <>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{renderContent(comment.content)}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    {currentUserId && (
                                        <button
                                            onClick={() => setReplyTo(comment)}
                                            className="text-xs text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Reply
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto opacity-0 group-hover:opacity-100"
                                            title="Delete Comment"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {replies.map(reply => (
                    <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                ))}
            </div>
        );
    };

    if (!pollId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {poll ? poll.question : 'Loading...'}
                        </h2>
                        {poll?.description && (
                            <p className="text-sm text-gray-500">{poll.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {poll && (currentUserId === poll.created_by || isAdmin) && (
                            <button
                                onClick={handleDeletePoll}
                                className="text-gray-400 hover:text-red-500 transition-colors mr-2 p-2"
                                title="Delete Poll"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {poll ? (
                        <div className="space-y-6">
                            {/* Results Breakdown */}
                            <div className="space-y-4">
                                {poll.options.map(option => {
                                    const percentage = poll.total_votes ? Math.round(((option.vote_count || 0) / poll.total_votes) * 100) : 0;
                                    const isWinner = Math.max(...poll.options.map(o => o.vote_count || 0)) === option.vote_count && (option.vote_count || 0) > 0;

                                    return (
                                        <div key={option.id} className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {option.option_text}
                                                    {isWinner && <CheckCircle2 size={14} className="text-green-600" />}
                                                </span>
                                                <span className="text-gray-500">{option.vote_count} votes ({percentage}%)</span>
                                            </div>

                                            {/* Bar */}
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${isWinner ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>

                                            {/* Voters */}
                                            {option.voters && option.voters.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {option.voters.map((voter, i) => (
                                                        <div key={i} className="relative group cursor-default">
                                                            {voter.avatar_url ? (
                                                                <img
                                                                    src={voter.avatar_url}
                                                                    alt={voter.user_name}
                                                                    className="w-6 h-6 rounded-full border border-white dark:border-gray-800"
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-white dark:border-gray-800">
                                                                    {voter.user_name.substring(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                                {voter.user_name}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Comments Section */}
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <MessageCircle size={20} />
                                    Discussion
                                </h3>

                                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                                    {comments.length === 0 ? (
                                        <p className="text-gray-400 text-sm italic">No comments yet.</p>
                                    ) : (
                                        rootComments.map((comment) => (
                                            <CommentItem key={comment.id} comment={comment} />
                                        ))
                                    )}
                                </div>

                                {currentUserId && canComment && (
                                    <div className="relative">
                                        {replyTo && (
                                            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-t-lg text-xs text-indigo-700 dark:text-indigo-300 mb-1">
                                                <span>Replying to <b>{replyTo.profiles?.user_name}</b></span>
                                                <button onClick={() => setReplyTo(null)}><X size={14} /></button>
                                            </div>
                                        )}

                                        {showMentions && mentionResults.length > 0 && (
                                            <div className="absolute bottom-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mb-2 overflow-hidden z-10">
                                                {mentionResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => insertMention(user.user_name)}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <img src={user.avatar_url} className="w-6 h-6 rounded-full" alt="" />
                                                        <span className="text-sm font-medium">{user.user_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <form onSubmit={handleAddComment} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={handleCommentChange}
                                                placeholder={replyTo ? "Write a reply..." : "Add a comment... (@ to mention)"}
                                                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={commentLoading || !newComment.trim()}
                                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
