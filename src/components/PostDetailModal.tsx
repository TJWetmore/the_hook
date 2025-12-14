import { useState, useEffect } from 'react';
import { api, type ForumPost, type Comment } from '../lib/api';
import { formatDate } from '../lib/utils';
import { X, MessageSquare, Send, ThumbsUp, Trash2 } from 'lucide-react';

interface PostDetailModalProps {
    post: ForumPost | null;
    onClose: () => void;
    currentUserId?: string;
    canComment?: boolean;
    isAdmin?: boolean;
    onDelete?: () => void;
}

export default function PostDetailModal({ post, onClose, currentUserId, canComment = true, isAdmin = false, onDelete }: PostDetailModalProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [localPost, setLocalPost] = useState<ForumPost | null>(post);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionResults, setMentionResults] = useState<any[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);

    useEffect(() => {
        setLocalPost(post);
        if (post) {
            fetchComments();
        }
    }, [post]);

    const fetchComments = async () => {
        if (!post) return;
        const data = await api.fetchPostComments(post.id);
        if (data) setComments(data);
    };

    const handleUsefulClick = async () => {
        if (!localPost || !currentUserId) return;

        // Optimistic update
        setLocalPost(prev => prev ? ({
            ...prev,
            upvotes: prev.is_useful ? prev.upvotes - 1 : prev.upvotes + 1,
            is_useful: !prev.is_useful
        }) : null);

        try {
            await api.togglePostUseful(localPost.id, currentUserId);
        } catch (error) {
            console.error('Error toggling useful:', error);
            setLocalPost(post); // Revert
        }
    };

    const handleCommentUsefulClick = async (commentId: string) => {
        if (!currentUserId) return;

        // Optimistic update
        setComments(prevComments => prevComments.map(c => {
            if (c.id !== commentId) return c;
            return {
                ...c,
                upvotes: (c.upvotes || 0) + (c.is_useful ? -1 : 1),
                is_useful: !c.is_useful
            };
        }));

        try {
            await api.toggleCommentUseful(commentId, currentUserId);
        } catch (error) {
            console.error('Error toggling comment useful:', error);
            fetchComments(); // Revert
        }
    };

    const handleDeletePost = async () => {
        if (!localPost || !currentUserId) return;
        // Allow if owner OR admin
        if (localPost.user_id !== currentUserId && !isAdmin) return;

        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            await api.softDeletePost(localPost.id);
            if (onDelete) onDelete();
            onClose();
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!currentUserId) return;

        // Find comment to check ownership (not efficient but safe)
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        if (comment.user_id !== currentUserId && !isAdmin) return;

        if (!confirm('Are you sure you want to delete this comment?')) return;

        // Optimistic update
        setComments(prev => prev.map(c => {
            if (c.id !== commentId) return c;
            return { ...c, deleted_at: new Date().toISOString() };
        }));

        try {
            await api.softDeleteComment(commentId);
        } catch (error) {
            console.error('Error deleting comment:', error);
            fetchComments(); // Revert
        }
    };

    // --- Comment Logic (Reused) ---
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
        if (!newComment.trim() || !currentUserId || !localPost) return;

        setCommentLoading(true);
        try {
            const { error } = await api.createPostComment(
                localPost.id,
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

    // --- Render Helpers ---
    const rootComments = comments.filter(c => !c.parent_id);
    const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

    const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
        const replies = getReplies(comment.id);
        const renderContent = (content: string) => {
            const parts = content.split(/(@\w+)/g);
            return parts.map((part, i) => {
                if (part.startsWith('@')) {
                    return <span key={i} className="text-green-600 font-bold">{part}</span>;
                }
                return part;
            });
        };

        const isDeleted = !!comment.deleted_at;
        const isAuthor = currentUserId === comment.user_id;
        const canDelete = isAuthor || isAdmin;

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
                                <div className="flex items-center gap-3 mt-2">
                                    {currentUserId && (
                                        <button
                                            onClick={() => setReplyTo(comment)}
                                            className="text-xs text-gray-500 font-bold hover:text-green-600 transition-colors"
                                        >
                                            Reply
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleCommentUsefulClick(comment.id)}
                                        className={`flex items-center gap-1 text-xs transition-colors ${comment.is_useful ? 'text-green-600 font-bold' : 'text-gray-400 hover:text-green-600'}`}
                                    >
                                        <ThumbsUp size={12} className={comment.is_useful ? 'fill-current' : ''} />
                                        {comment.upvotes || 0}
                                    </button>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto opacity-0 group-hover:opacity-100"
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

    if (!localPost) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${localPost.category === 'Vendor Review' ? 'bg-blue-100 text-blue-700' :
                                localPost.category === 'Renovation' ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {localPost.category}
                            </span>
                            <span className="text-xs text-gray-400">• {formatDate(localPost.created_at)}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {localPost.post_name}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="prose dark:prose-invert max-w-none flex-1">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{localPost.content}</p>
                        </div>
                        {(currentUserId === localPost.user_id || isAdmin) && (
                            <button
                                onClick={handleDeletePost}
                                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                title="Delete Post"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-gray-500 text-sm mb-8">
                        <button
                            onClick={handleUsefulClick}
                            className={`flex items-center gap-1 hover:text-green-600 transition-colors ${localPost.is_useful ? 'text-green-600 font-bold' : ''}`}
                        >
                            <ThumbsUp size={16} className={localPost.is_useful ? 'fill-current' : ''} />
                            {localPost.upvotes} useful
                        </button>
                        <span className="flex items-center gap-1"><MessageSquare size={16} /> {comments.length} replies</span>
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MessageSquare size={20} />
                            Discussion
                        </h3>

                        <div className="space-y-4 mb-6">
                            {comments.length === 0 ? (
                                <p className="text-gray-400 text-sm italic">No comments yet. Be the first to reply!</p>
                            ) : (
                                rootComments.map((comment) => (
                                    <CommentItem key={comment.id} comment={comment} />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Input */}
                {currentUserId && canComment && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="relative">
                            {replyTo && (
                                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-t-lg text-xs text-green-700 dark:text-green-300 mb-1">
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
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    type="submit"
                                    disabled={commentLoading || !newComment.trim()}
                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
