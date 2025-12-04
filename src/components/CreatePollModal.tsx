import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';
import { X, Loader2, Plus, Trash2, BarChart2 } from 'lucide-react';

interface CreatePollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPollCreated: () => void;
}

export default function CreatePollModal({ isOpen, onClose, onPollCreated }: CreatePollModalProps) {
    const [question, setQuestion] = useState('');
    const [description, setDescription] = useState('');
    const [options, setOptions] = useState([{ text: '', description: '' }, { text: '', description: '' }]);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleAddOption = () => {
        setOptions([...options, { text: '', description: '' }]);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, field: 'text' | 'description', value: string) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (options.some(opt => !opt.text.trim())) {
            alert('Please fill in all option texts.');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Calculate closes_at (2 weeks from now)
            const closesAt = new Date();
            closesAt.setDate(closesAt.getDate() + 14);

            const { error } = await api.createPoll({
                question,
                description,
                created_by: user.id,
                closes_at: closesAt.toISOString(),
                visibility: 'public' // Default to public for now
            }, options.map(opt => ({
                option_text: opt.text,
                description: opt.description
            })));

            if (error) throw error;

            onPollCreated();
            onClose();
            // Reset form
            setQuestion('');
            setDescription('');
            setOptions([{ text: '', description: '' }, { text: '', description: '' }]);
        } catch (error) {
            console.error('Error creating poll:', error);
            alert('Failed to create poll.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart2 className="text-indigo-600" />
                        Create New Poll
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">Question</label>
                            <input
                                type="text"
                                required
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="e.g. Should we renovate the lobby?"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-20"
                                placeholder="Provide more context..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Voting Options</label>
                            <div className="space-y-3">
                                {options.map((option, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                required
                                                value={option.text}
                                                onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:border-indigo-500"
                                                placeholder={`Option ${index + 1}`}
                                            />
                                            <input
                                                type="text"
                                                value={option.description}
                                                onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                                                className="w-full px-3 py-1.5 rounded-lg border-none bg-transparent text-xs text-gray-500 focus:outline-none focus:text-gray-900 dark:focus:text-gray-100 placeholder-gray-400"
                                                placeholder="Add description (optional)"
                                            />
                                        </div>
                                        {options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(index)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                <Plus size={16} />
                                Add Option
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Poll'}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-3">
                            Poll will be open for 2 weeks.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
