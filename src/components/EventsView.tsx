import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar, MapPin, Plus } from 'lucide-react';
import SubmitEventModal from './SubmitEventModal';
import EventDetailModal from './EventDetailModal';

interface Event {
    id: string;
    event_name: string;
    host_organization: string;
    start_time: string;
    end_time: string;
    location: string;
    description: string;
    image_url: string;
    created_by: string;
}

interface EventsViewProps {
    events: Event[];
    onRefresh: () => void;
}

export default function EventsView({ events, onRefresh }: EventsViewProps) {
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h2>
                    <p className="text-gray-500 dark:text-gray-400">What's happening in the Hook.</p>
                </div>
                <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    <Plus size={18} />
                    <span>Submit Event</span>
                </button>
            </div>

            <div className="space-y-4">
                {events.map((event) => {
                    const date = new Date(event.start_time);
                    return (
                        <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 flex gap-6 hover:shadow-md transition-all cursor-pointer hover:border-indigo-300"
                        >
                            {/* Date Box */}
                            <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400">
                                <span className="text-xs font-bold uppercase tracking-wider">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className="text-3xl font-bold">{date.getDate()}</span>
                                <span className="text-xs font-medium">{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        {event.host_organization}
                                    </span>
                                    {event.image_url && <span className="text-xl">🎨</span>}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{event.event_name}</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{event.description}</p>
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <MapPin size={16} />
                                    <span>{event.location}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {events.length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No upcoming events</h3>
                        <p className="text-gray-500">Check back later or submit your own!</p>
                    </div>
                )}
            </div>

            <SubmitEventModal
                isOpen={isSubmitModalOpen}
                onClose={() => setIsSubmitModalOpen(false)}
                onEventCreated={onRefresh}
            />
            <EventDetailModal
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                currentUserId={user?.id}
            />
        </div>
    );
}
