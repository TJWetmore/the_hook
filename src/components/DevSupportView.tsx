import { useState, useEffect } from 'react';
import { api, type DevSupportTicket, type Comment } from '../lib/api';
import { Plus, Bug, Lightbulb, AlertCircle, CheckCircle, Clock, RotateCw, ThumbsUp, MessageSquare, ChevronDown, ChevronUp, Send, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/utils';

interface DevSupportViewProps {
    user: { id: string; email?: string } | null;
    canInteract?: boolean;
    isAdmin?: boolean;
}

export default function DevSupportView({ user, canInteract = true, isAdmin = false }: DevSupportViewProps) {
    const [tickets, setTickets] = useState<DevSupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Form State
    const [newTicket, setNewTicket] = useState<{
        type: 'bug' | 'feature';
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
    }>({
        type: 'bug',
        title: '',
        description: '',
        priority: 'medium'
    });
    const [submitLoading, setSubmitLoading] = useState(false);

    const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
    const [ticketComments, setTicketComments] = useState<Record<string, Comment[]>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
    const [newComment, setNewComment] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        const data = await api.fetchDevSupportTickets();
        if (data) setTickets(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleVote = async (ticketId: string) => {
        if (!user) return;

        // Optimistic update
        setTickets(prev => prev.map((t: DevSupportTicket) => {
            if (t.id === ticketId) {
                return {
                    ...t,
                    upvotes: t.is_liked_by_me ? t.upvotes - 1 : t.upvotes + 1,
                    is_liked_by_me: !t.is_liked_by_me
                };
            }
            return t;
        }));

        await api.toggleDevSupportTicketVote(ticketId, user.id);
    };

    const toggleExpandTicket = async (ticketId: string) => {
        if (expandedTicketId === ticketId) {
            setExpandedTicketId(null);
            return;
        }

        setExpandedTicketId(ticketId);

        if (!ticketComments[ticketId]) {
            setLoadingComments(prev => ({ ...prev, [ticketId]: true }));
            const comments = await api.fetchDevSupportComments(ticketId);
            if (comments) {
                setTicketComments(prev => ({ ...prev, [ticketId]: comments }));
            }
            setLoadingComments(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    const handleCommentSubmit = async (ticketId: string) => {
        if (!user || !newComment.trim()) return;

        const { error } = await api.createDevSupportComment(ticketId, user.id, newComment);

        if (!error) {
            setNewComment('');
            const comments = await api.fetchDevSupportComments(ticketId);
            if (comments) {
                setTicketComments(prev => ({ ...prev, [ticketId]: comments }));
            }
        }
    };

    const handleDeleteTicket = async (ticketId: string) => {
        if (!confirm('Are you sure you want to delete this ticket?')) return;

        // Optimistic update
        setTickets(prev => prev.filter(t => t.id !== ticketId));

        try {
            await api.softDeleteDevSupportTicket(ticketId);
        } catch (error) {
            console.error('Error deleting ticket:', error);
            fetchTickets(); // Revert
        }
    };

    const handleDeleteComment = async (ticketId: string, commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        setTicketComments(prev => ({
            ...prev,
            [ticketId]: prev[ticketId].map(c => {
                if (c.id !== commentId) return c;
                return { ...c, deleted_at: new Date().toISOString() };
            })
        }));

        try {
            await api.softDeleteDevSupportComment(commentId);
        } catch (error) {
            console.error('Error deleting comment:', error);
            // Refresh comments
            const comments = await api.fetchDevSupportComments(ticketId);
            if (comments) {
                setTicketComments(prev => ({ ...prev, [ticketId]: comments }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitLoading(true);
        try {
            const { error } = await api.createDevSupportTicket({
                ...newTicket,
                status: 'open'
            }, user.id);

            if (error) throw error;

            setShowCreateForm(false);
            setNewTicket({ type: 'bug', title: '', description: '', priority: 'medium' });
            fetchTickets();
        } catch (error) {
            console.error("Error submitting ticket:", error);
            alert("Failed to submit ticket. Please try again.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-red-600 bg-red-100 border-red-200';
            case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
            case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            case 'low': return 'text-green-600 bg-green-100 border-green-200';
            default: return 'text-gray-600 bg-gray-100 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <AlertCircle size={16} className="text-blue-500" />;
            case 'in_progress': return <Clock size={16} className="text-yellow-500" />;
            case 'resolved': return <CheckCircle size={16} className="text-green-500" />;
            case 'closed': return <CheckCircle size={16} className="text-gray-500" />;
            default: return <AlertCircle size={16} />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Bug className="text-indigo-500" />
                        Dev Support
                    </h2>
                    <p className="text-gray-500 mt-1">Report bugs or suggest features directly to the developers.</p>
                </div>
                {user ? (
                    canInteract ? (
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                            {showCreateForm ? 'Cancel' : (
                                <>
                                    <Plus size={20} />
                                    New Ticket
                                </>
                            )}
                        </button>
                    ) : null
                ) : (
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">Sign in to submit tickets</div>
                )}
            </div>

            {showCreateForm && (
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Submit New Ticket</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewTicket(prev => ({ ...prev, type: 'bug' }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${newTicket.type === 'bug'
                                            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        <Bug size={16} /> Bug Report
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewTicket(prev => ({ ...prev, type: 'feature' }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${newTicket.type === 'feature'
                                            ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                            }`}
                                    >
                                        <Lightbulb size={16} /> Feature Request
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                                <select
                                    value={newTicket.priority}
                                    onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="low">Low - Nice to have</option>
                                    <option value="medium">Medium - Standard</option>
                                    <option value="high">High - Important</option>
                                    <option value="critical">Critical - Broken</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                            <input
                                type="text"
                                required
                                value={newTicket.title}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Brief summary of the issue or idea"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                required
                                rows={4}
                                value={newTicket.description}
                                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Detailed description. Steps to reproduce for bugs, or use case for features."
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={submitLoading || !newTicket.title || !newTicket.description}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitLoading ? <RotateCw size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                Submit Ticket
                            </button>
                        </div>
                    </form>
                </div>
            )
            }

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Bug size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tickets yet</h3>
                        <p className="text-gray-500">Found a bug? Be the first to report it!</p>
                    </div>
                ) : (
                    tickets.map((ticket: DevSupportTicket) => (
                        <div key={ticket.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    {ticket.type === 'bug' ? (
                                        <span className="p-1.5 bg-red-100 text-red-600 rounded-lg"><Bug size={16} /></span>
                                    ) : (
                                        <span className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Lightbulb size={16} /></span>
                                    )}
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.title}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide border ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                    {/* Delete Ticket Button */}
                                    {(user?.id === ticket.user_id || isAdmin) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTicket(ticket.id);
                                            }}
                                            className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="Delete Ticket"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">{ticket.description}</p>

                            <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        {getStatusIcon(ticket.status)}
                                        <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                                    </span>
                                    <span>#{ticket.id.slice(0, 8)}</span>
                                    <span className="text-xs">
                                        {formatDate(ticket.created_at)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleVote(ticket.id)}
                                        disabled={!user}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${ticket.is_liked_by_me
                                            ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <ThumbsUp size={16} className={ticket.is_liked_by_me ? 'fill-current' : ''} />
                                        <span>{ticket.upvotes}</span>
                                    </button>
                                    <button
                                        onClick={() => toggleExpandTicket(ticket.id)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <MessageSquare size={16} />
                                        <span>Comments</span>
                                        {expandedTicketId === ticket.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Comments Section */}
                            {expandedTicketId === ticket.id && (
                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Discussion</h4>

                                    <div className="space-y-4 mb-4">
                                        {loadingComments[ticket.id] ? (
                                            <div className="flex justify-center py-4">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                            </div>
                                        ) : !ticketComments[ticket.id] || ticketComments[ticket.id].length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No comments yet.</p>
                                        ) : (
                                            ticketComments[ticket.id].map((comment: Comment) => {
                                                const isDeleted = !!comment.deleted_at;
                                                const isAuthor = user?.id === comment.user_id;
                                                const canDelete = isAuthor || isAdmin;

                                                return (
                                                    <div key={comment.id} className="flex gap-3">
                                                        <img
                                                            src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`}
                                                            alt="Avatar"
                                                            className="w-8 h-8 rounded-full bg-gray-100"
                                                        />
                                                        <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 group">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                                    {comment.profiles?.user_name || 'User'}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {formatDate(comment.created_at)}
                                                                </span>
                                                            </div>
                                                            {isDeleted ? (
                                                                <p className="text-sm text-gray-500 italic">deleted by user</p>
                                                            ) : (
                                                                <>
                                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                                                                    {canDelete && (
                                                                        <div className="flex justify-end mt-1">
                                                                            <button
                                                                                onClick={() => handleDeleteComment(ticket.id, comment.id)}
                                                                                className="text-xs text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                                title="Delete Comment"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    {user && canInteract && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Add a comment..."
                                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCommentSubmit(ticket.id);
                                                }}
                                            />
                                            <button
                                                onClick={() => handleCommentSubmit(ticket.id)}
                                                disabled={!newComment.trim()}
                                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    ))
                )}
            </div>
        </div >
    );
}
