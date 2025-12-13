import { useState, useEffect } from 'react';
import { api, type PackageReport, type Comment } from '../lib/api';
import { X, Package, CheckCircle, Send, MessageCircle, Share2 } from 'lucide-react';

interface PackageDetailModalProps {
    pkg: PackageReport | null;
    onClose: () => void;
    onResolve: () => void;
    currentUserId?: string;
    canComment?: boolean;
}

export default function PackageDetailModal({ pkg, onClose, onResolve, currentUserId, canComment = true }: PackageDetailModalProps) {
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionResults, setMentionResults] = useState<any[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);

    useEffect(() => {
        if (pkg) {
            fetchComments();
        }
    }, [pkg]);

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

    const fetchComments = async () => {
        if (!pkg) return;
        const data = await api.fetchPackageComments(pkg.id);
        if (data) setComments(data);
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const pos = e.target.selectionStart || 0;
        setNewComment(value);
        setCursorPosition(pos);

        // Check for mention trigger
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
        // Focus back to input would be ideal here
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId || !pkg) return;

        setCommentLoading(true);
        try {
            const { error } = await api.createPackageComment(
                pkg.id,
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

    if (!pkg) return null;

    const isOwner = currentUserId === pkg.user_id;

    const handleResolve = async () => {
        if (!confirm('Are you sure you want to mark this as resolved? It will be removed from the list.')) return;

        setLoading(true);
        try {
            const { error } = await api.resolvePackage(pkg.id);

            if (error) throw error;
            onResolve();
            onClose();
        } catch (error) {
            console.error('Error resolving package:', error);
            alert('Failed to update status.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!pkg) return;

        const shareData = {
            title: `Package Report: ${pkg.item_description}`,
            text: `Check out this package report: ${pkg.item_description} - ${pkg.report_type === 'found' ? 'Found at' : 'Last seen at'} ${pkg.location_found}`,
            url: window.location.href // Or specific package URL if routing existed
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback to Facebook Sharer
            // Since we might be on localhost, the URL might not be reachable by FB, but we can try.
            // Better fallback for localhost might be just copying text, but user asked for FB.
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareData.text)}`;
            window.open(fbUrl, '_blank', 'width=600,height=400');
        }
    };

    // Organize comments into threads
    const rootComments = comments.filter(c => !c.parent_id);
    const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

    const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
        const replies = getReplies(comment.id);

        // Parse content for mentions
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
                        <p className="text-sm text-gray-700 dark:text-gray-300">{renderContent(comment.content)}</p>
                        {currentUserId && (
                            <button
                                onClick={() => setReplyTo(comment)}
                                className="text-xs text-indigo-600 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                Reply
                            </button>
                        )}
                    </div>
                </div>
                {replies.map(reply => (
                    <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${pkg.report_type === 'found' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {pkg.report_type}
                        </span>
                        <span className="text-gray-400 text-xs font-mono">
                            {new Date(pkg.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleShare} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mr-2" title="Share">
                            <Share2 size={20} />
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="flex items-start gap-4 mb-6">
                        <div className={`p-3 rounded-full flex-shrink-0 ${pkg.report_type === 'found' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                            <Package size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{pkg.item_description}</h2>
                            <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <span>📍 {pkg.report_type === 'found' ? 'Found at:' : 'Last seen:'}</span>
                                <span className="font-medium">{pkg.location_found}</span>
                            </p>
                        </div>
                    </div>

                    {pkg.additional_notes && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Additional Notes</h3>
                            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                {pkg.additional_notes}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-6">
                        {pkg.is_food && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-bold rounded-full flex items-center gap-1">
                                🍔 Food Delivery
                            </span>
                        )}
                        {pkg.package_digits && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-mono font-bold rounded-full border border-gray-200">
                                #{pkg.package_digits}
                            </span>
                        )}
                    </div>

                    {pkg.image_url && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <img
                                src={pkg.image_url}
                                alt="Package Evidence"
                                className="w-full h-auto max-h-96 object-contain"
                            />
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MessageCircle size={20} />
                            Comments
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

                        {currentUserId && (canComment || isOwner) && (
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

                    {/* Actions */}
                    {isOwner && (
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={handleResolve}
                                disabled={loading}
                                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {loading ? 'Updating...' : (
                                    <>
                                        <CheckCircle size={20} />
                                        Mark as Resolved
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-2">
                                This will remove the post from the community board.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
