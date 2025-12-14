import { useState, useEffect } from 'react';
import { api, type Event, type Comment } from '../lib/api';
import { formatDate } from '../lib/utils';
import { X, Calendar, MapPin, MessageCircle, Send, CalendarPlus, Download, ExternalLink, Trash2 } from 'lucide-react';

interface EventDetailModalProps {
    event: Event | null;
    onClose: () => void;
    currentUserId?: string;
    canComment?: boolean;
    isAdmin?: boolean;
    onDelete?: () => void;
}

export default function EventDetailModal({ event, onClose, currentUserId, canComment = true, isAdmin = false, onDelete }: EventDetailModalProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [showCalendarOptions, setShowCalendarOptions] = useState(false);

    useEffect(() => {
        if (event) {
            fetchComments();
        }
    }, [event]);

    const fetchComments = async () => {
        if (!event) return;
        const data = await api.fetchEventComments(event.id);
        if (data) setComments(data);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserId || !event) return;

        setCommentLoading(true);
        try {
            const { error } = await api.createEventComment(event.id, currentUserId, newComment.trim());

            if (error) throw error;
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setCommentLoading(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!event) return;
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            await api.softDeleteEvent(event.id);
            if (onDelete) onDelete();
            onClose();
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        setComments(prev => prev.map(c => {
            if (c.id !== commentId) return c;
            return { ...c, deleted_at: new Date().toISOString() };
        }));

        try {
            await api.softDeleteEventComment(commentId);
        } catch (error) {
            console.error('Error deleting comment:', error);
            fetchComments();
        }
    };

    const addToGoogleCalendar = () => {
        if (!event) return;
        const startDate = new Date(event.start_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const endDate = new Date(event.end_time).toISOString().replace(/-|:|\.\d\d\d/g, "");

        const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.event_name)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&sf=true&output=xml`;
        window.open(url, '_blank');
        setShowCalendarOptions(false);
    };

    const downloadIcal = () => {
        if (!event) return;
        const startDate = new Date(event.start_time).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const endDate = new Date(event.end_time).toISOString().replace(/-|:|\.\d\d\d/g, "");

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.href}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.event_name}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `${event.event_name}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowCalendarOptions(false);
    };

    if (!event) return null;

    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);

    // Checked schema before? Event type usually has user_id. Let's assume user_id. 
    // Wait, the file didn't use user_id before.
    // Let me check 'Event' type definition in api.ts if I can... or I can guess.
    // The previous file content shows `interface Event` imported.
    // I'll assume it has user_id. If not I might get an error.
    // Looking at other files, `ForumPost` has `user_id`. `MarketplaceItem` has `user_id`.
    // It is highly likely `Event` has `user_id`.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold uppercase tracking-wider">
                            {event.host_organization}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                <CalendarPlus size={16} />
                                <span className="hidden sm:inline">Add to Calendar</span>
                            </button>

                            {showCalendarOptions && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-10">
                                    <button
                                        onClick={addToGoogleCalendar}
                                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                    >
                                        <ExternalLink size={16} className="text-blue-500" />
                                        Google Calendar
                                    </button>
                                    <button
                                        onClick={downloadIcal}
                                        className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                                    >
                                        <Download size={16} className="text-green-500" />
                                        Download .ics File
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{event.event_name}</h2>

                    <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 mb-6 text-sm">
                        <div className="flex items-center gap-1">
                            <Calendar size={16} />
                            <span>
                                {formatDate(event.start_time)} • {startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MapPin size={16} />
                            <span>{event.location}</span>
                        </div>
                    </div>

                    {event.image_url && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <img
                                src={event.image_url}
                                alt="Event"
                                className="w-full h-auto max-h-96 object-contain"
                            />
                        </div>
                    )}

                    <p className="text-gray-700 dark:text-gray-300 mb-8 whitespace-pre-wrap">
                        {event.description}
                    </p>

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
                                comments.map((comment) => {
                                    const isDeleted = !!comment.deleted_at;
                                    const isAuthor = currentUserId === comment.user_id;
                                    const canDelete = isAuthor || isAdmin;

                                    return (
                                        <div key={comment.id} className="flex gap-3">
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
                                                        {canDelete && (
                                                            <div className="flex justify-end mt-1">
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
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
                                    );
                                })
                            )}
                        </div>

                        {currentUserId && canComment && (
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

                    {/* Owner/Admin Actions */}
                    {(currentUserId === event.created_by || isAdmin) && (
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={handleDeleteEvent}
                                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                Delete Event
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
