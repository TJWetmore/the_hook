import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Package, CheckCircle, Send, MessageCircle } from 'lucide-react';

interface PackageReport {
    id: string;
    item_description: string;
    location_found: string;
    status: string;
    report_type: 'found' | 'lost';
    created_at: string;
    package_digits?: string;
    image_url?: string;
    is_food?: boolean;
    additional_notes?: string;
    user_id: string; // Needed to check ownership
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
        user_name: string;
        avatar_url: string;
    };
}

interface PackageDetailModalProps {
    pkg: PackageReport | null;
    onClose: () => void;
    onResolve: () => void;
    currentUserId?: string;
}

export default function PackageDetailModal({ pkg, onClose, onResolve, currentUserId }: PackageDetailModalProps) {
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    useEffect(() => {
        if (pkg) {
            fetchComments();
        }
    }, [pkg]);

    const fetchComments = async () => {
        if (!pkg) return;
        const { data, error } = await supabase
            .from('package_comments')
            .select(`
                *,
                profiles (user_name, avatar_url)
            `)
            .eq('package_id', pkg.id)
            .order('created_at', { ascending: true });

        if (error) console.error('Error fetching comments:', error);
        else setComments(data as any || []);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId || !pkg) return;

        setCommentLoading(true);
        try {
            const { error } = await supabase
                .from('package_comments')
                .insert({
                    package_id: pkg.id,
                    user_id: currentUserId,
                    content: newComment.trim()
                });

            if (error) throw error;
            setNewComment('');
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
            const { error } = await supabase
                .from('package_reports')
                .update({ status: 'resolved' })
                .eq('id', pkg.id);

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
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X size={24} />
                    </button>
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
                                comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <img
                                            src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user_id}`}
                                            alt="Avatar"
                                            className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0"
                                        />
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex-1">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {comment.profiles?.user_name || 'Neighbor'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(comment.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {currentUserId && (
                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
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
