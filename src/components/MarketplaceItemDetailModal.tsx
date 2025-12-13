import { useState, useRef, useEffect } from 'react';
import { api, type MarketplaceItem, type Comment } from '../lib/api';
import { formatDate } from '../lib/utils';
import { X, MapPin, Calendar, Mail, Eye, Heart, MessageSquare, Send, ThumbsUp, Trash2, CheckCircle, Gift } from 'lucide-react';

interface MarketplaceItemDetailModalProps {
    item: MarketplaceItem | null;
    onClose: () => void;
    onLikeToggle: () => void;
    onView?: () => void;
    currentUserId?: string;
    onStatusUpdate?: (status: 'sold' | 'given_away') => void;
    canComment?: boolean;
}

export default function MarketplaceItemDetailModal({ item, onClose, onLikeToggle, onView, currentUserId, onStatusUpdate, canComment = true }: MarketplaceItemDetailModalProps) {
    const hasIncrementedView = useRef(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);

    useEffect(() => {
        if (item) {
            fetchComments();
        }
    }, [item]);

    const fetchComments = async () => {
        if (!item) return;
        const data = await api.fetchMarketplaceComments(item.id);
        if (data) setComments(data);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId || !item) return;

        setCommentLoading(true);
        try {
            const { error } = await api.createMarketplaceComment(
                item.id,
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

    const handleCommentUsefulClick = async (commentId: string) => {
        if (!currentUserId) return;

        setComments(prevComments => prevComments.map(c => {
            if (c.id !== commentId) return c;
            return {
                ...c,
                upvotes: (c.upvotes || 0) + (c.is_useful ? -1 : 1),
                is_useful: !c.is_useful
            };
        }));

        try {
            await api.toggleMarketplaceCommentUseful(commentId, currentUserId);
        } catch (error) {
            console.error('Error toggling comment useful:', error);
            fetchComments();
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!currentUserId) return;
        if (!confirm('Are you sure you want to delete this comment?')) return;

        setComments(prev => prev.map(c => {
            if (c.id !== commentId) return c;
            return { ...c, deleted_at: new Date().toISOString() };
        }));

        try {
            await api.deleteMarketplaceComment(commentId, currentUserId);
        } catch (error) {
            console.error('Error deleting comment:', error);
            fetchComments();
        }
    };

    const handleStatusUpdate = async (status: 'sold' | 'given_away') => {
        if (!item || !onStatusUpdate) return;
        if (!confirm(`Mark this item as ${status.replace('_', ' ')}?`)) return;

        try {
            await api.updateMarketplaceItemStatus(item.id, status);
            onStatusUpdate(status);
            onClose();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // --- Render Helpers ---
    const rootComments = comments.filter(c => !c.parent_id);
    const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

    const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
        const replies = getReplies(comment.id);
        const isDeleted = !!comment.deleted_at;
        const isAuthor = currentUserId === comment.user_id;

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
                                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
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
                                    {isAuthor && (
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

    useEffect(() => {
        if (item && !hasIncrementedView.current) {
            hasIncrementedView.current = true;
            api.incrementMarketplaceItemView(item.id)
                .then(() => {
                    onView?.();
                })
                .catch(console.error);
        }

        // Reset if item changes (though usually this modal mounts/unmounts)
        return () => {
            // cleanup if needed
        };
    }, [item?.id]);

    if (!item) return null;

    const handleEmailClick = () => {
        if (!item.contact_email) return;
        const subject = `Interested in: ${item.item_name}`;
        const body = `Hi ${item.profile.user_name},\n\nI saw your listing for "${item.item_name}" on The Hook and I'm interested.\n\nThanks!`;
        window.location.href = `mailto:${item.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                    {item.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.item_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-lg font-medium">No Image</span>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute bottom-4 left-4 flex gap-2">
                        <span className="px-3 py-1 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-lg text-sm font-bold shadow-sm text-gray-900 dark:text-white">
                            {item.price ? `$${item.price}${item.is_negotiable ? ' OBO' : ''}` : 'FREE'}
                        </span>
                        {item.status !== 'available' && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold uppercase tracking-wide">
                                {item.status.replace('_', ' ')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6 md:p-8 flex-1">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{item.item_name}</h2>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                {item.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={16} /> {item.location}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar size={16} /> Posted {formatDate(item.created_at)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-4 text-gray-500 text-sm">
                                <span className="flex items-center gap-1">
                                    <Eye size={16} /> {item.view_count + (hasIncrementedView.current ? 1 : 0)} views
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="prose dark:prose-invert max-w-none mb-8 text-gray-600 dark:text-gray-300">
                        <p className="whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {item.give_away_by && (
                        <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30 flex items-start gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-800/30 rounded-lg text-orange-600 dark:text-orange-400">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Deadline</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Owner wants to give this away by <span className="font-bold text-orange-700 dark:text-orange-300">{formatDate(item.give_away_by)}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <img
                                src={item.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user_id}`}
                                alt="Avatar"
                                className="w-10 h-10 rounded-full bg-gray-100"
                            />
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{item.profile?.user_name || 'Neighbor'}</p>
                                <p className="text-xs text-gray-500">Listed this item</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onLikeToggle}
                                className={`p-3 rounded-lg border transition-colors flex items-center gap-2 ${item.is_liked_by_me
                                    ? 'border-pink-200 bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-400'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-400'
                                    }`}
                            >
                                <Heart size={20} className={item.is_liked_by_me ? 'fill-current' : ''} />
                                <span className="font-bold text-sm">{item.like_count}</span>
                            </button>

                            <button
                                onClick={handleEmailClick}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Mail size={20} />
                                Message Seller
                            </button>
                        </div>
                    </div>

                    {/* Owner Actions */}
                    {currentUserId === item.user_id && item.status === 'available' && (
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Owner Actions</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleStatusUpdate('sold')}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    Mark as Sold
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate('given_away')}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Gift size={18} />
                                    Mark as Given Away
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MessageSquare size={20} />
                            Q&A and Discussion
                        </h3>

                        <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                            {comments.length === 0 ? (
                                <p className="text-gray-400 text-sm italic">No comments yet. Ask a question?</p>
                            ) : (
                                rootComments.map((comment) => (
                                    <CommentItem key={comment.id} comment={comment} />
                                ))
                            )}
                        </div>

                        {currentUserId && canComment && (
                            <div className="relative">
                                {replyTo && (
                                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-t-lg text-xs text-green-700 dark:text-green-300 mb-1">
                                        <span>Replying to <b>{replyTo.profiles?.user_name}</b></span>
                                        <button onClick={() => setReplyTo(null)}><X size={14} /></button>
                                    </div>
                                )}
                                <form onSubmit={handleAddComment} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={replyTo ? "Write a reply..." : "Ask a question..."}
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
            </div>
        </div>
    );
}
