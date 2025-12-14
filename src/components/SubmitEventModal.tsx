import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';
import { X, Loader2, Calendar, Upload, Image as ImageIcon } from 'lucide-react';

interface SubmitEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: () => void;
}

export default function SubmitEventModal({ isOpen, onClose, onEventCreated }: SubmitEventModalProps) {
    const [eventName, setEventName] = useState('');
    const [hostOrg, setHostOrg] = useState('');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (!startTime || !endTime) throw new Error('Please select start and end times');

            const { error } = await api.createEvent({
                event_name: eventName,
                host_organization: hostOrg,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                location,
                description,
                created_by: user.id
            }, imageFile);

            if (error) throw error;

            onEventCreated();
            onClose();
            setEventName('');
            setHostOrg('');
            setStartTime(null);
            setEndTime(null);
            setLocation('');
            setDescription('');
            setImageFile(null);
        } catch (error) {
            console.error('Error submitting event:', error);
            alert('Failed to submit event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="text-green-600" />
                        Submit Event
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Name</label>
                        <input
                            type="text"
                            required
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Host</label>
                        <input
                            type="text"
                            required
                            value={hostOrg}
                            onChange={(e) => setHostOrg(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. East River Wine Coop"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                            <DatePicker
                                selected={startTime}
                                onChange={(date) => setStartTime(date)}
                                showTimeSelect
                                dateFormat="MM/dd/yyyy h:mm aa"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                                placeholderText="Select start time"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                            <DatePicker
                                selected={endTime}
                                onChange={(date) => setEndTime(date)}
                                showTimeSelect
                                dateFormat="MM/dd/yyyy h:mm aa"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                                placeholderText="Select end time"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                        <input
                            type="text"
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Image (Optional)</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="event-image-upload"
                            />
                            <label
                                htmlFor="event-image-upload"
                                className="flex items-center justify-center gap-2 w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500 dark:hover:border-green-400 transition-colors"
                            >
                                {imageFile ? (
                                    <>
                                        <ImageIcon size={20} className="text-green-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{imageFile.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={20} className="text-gray-400" />
                                        <span className="text-sm text-gray-500">Upload Image</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Event'}
                    </button>
                </form>
            </div>
        </div>
    );
}
