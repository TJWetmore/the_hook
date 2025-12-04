import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';
import { X, Loader2, Package, Upload, Image as ImageIcon } from 'lucide-react';

interface ReportPackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReportCreated: () => void;
    initialStatus?: 'found' | 'missing';
}

export default function ReportPackageModal({ isOpen, onClose, onReportCreated, initialStatus = 'found' }: ReportPackageModalProps) {
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [status, setStatus] = useState<'found' | 'missing'>(initialStatus);
    const [packageDigits, setPackageDigits] = useState('');
    const [isFood, setIsFood] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
        }
    }, []);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await api.createPackageReport({
                item_description: description,
                location_found: location,
                report_type: status === 'missing' ? 'lost' : 'found',
                status: 'open',
                user_id: user.id,
                package_digits: packageDigits,
                is_food: isFood,
                additional_notes: additionalNotes
            }, imageFile);

            if (error) throw error;

            onReportCreated();
            onClose();
            setDescription('');
            setLocation('');
            setAdditionalNotes('');
            setImageFile(null);
            setPackageDigits('');
            setIsFood(false);
        } catch (error) {
            console.error('Error reporting package:', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className={status === 'found' ? 'text-green-600' : 'text-red-600'} />
                        {status === 'found' ? 'Found a Package' : 'Report Missing Package'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Status Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                        <button
                            type="button"
                            onClick={() => setStatus('found')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${status === 'found'
                                ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            Found
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('missing')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${status === 'missing'
                                ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            Missing
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Description</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder={status === 'found' ? "e.g. Blue Chewy Box" : "e.g. Zara Package (White bag)"}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {status === 'found' ? 'Location Found' : 'Last Known Location'}
                        </label>
                        <input
                            type="text"
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder={status === 'found' ? "e.g. Bldg 1 Lobby" : "e.g. Delivered to Mailroom"}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Additional Notes / Instructions (Optional)
                        </label>
                        <textarea
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-20"
                            placeholder="e.g. Left at front desk, pick up on 4th floor..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last 4 Digits of Tracking Number</label>
                            <input
                                type="text"
                                maxLength={4}
                                value={packageDigits}
                                onChange={(e) => setPackageDigits(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 1285"
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isFood}
                                    onChange={(e) => setIsFood(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Food Delivery?</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo (Optional)</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="image-upload"
                            />
                            <label
                                htmlFor="image-upload"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDragging
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400'
                                    }`}
                            >
                                {imageFile ? (
                                    <>
                                        <ImageIcon size={32} className="text-indigo-500" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{imageFile.name}</span>
                                        <span className="text-xs text-gray-500">Click or drag to replace</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={32} className={isDragging ? 'text-indigo-500' : 'text-gray-400'} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
                                        </span>
                                        <span className="text-xs text-gray-500">SVG, PNG, JPG or GIF</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${status === 'found' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Report'}
                    </button>
                </form>
            </div>
        </div>
    );
}
