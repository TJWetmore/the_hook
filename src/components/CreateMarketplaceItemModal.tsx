import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';
import { X, Loader2, Upload, DollarSign, Calendar, MapPin } from 'lucide-react';

interface CreateMarketplaceItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemCreated: () => void;
}

export default function CreateMarketplaceItemModal({ isOpen, onClose, onItemCreated }: CreateMarketplaceItemModalProps) {
    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState<string>('');
    const [isNegotiable, setIsNegotiable] = useState(false);
    const [giveAwayBy, setGiveAwayBy] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Initial load for contact email
    useEffect(() => {
        if (!isOpen) return;
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.email) setContactEmail(user.email);
        });
    }, [isOpen]);

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

            if (!giveAwayBy) {
                alert('Please select a "Give Away By" date.');
                setLoading(false);
                return;
            }

            const { error } = await api.createMarketplaceItem({
                item_name: itemName,
                description,
                location,
                price: price ? parseFloat(price) : null,
                is_negotiable: isNegotiable,
                give_away_by: new Date(giveAwayBy).toISOString(), // Now guaranteed to be set
                status: 'available',
                user_id: user.id,
                contact_email: contactEmail
            }, imageFile);

            if (error) throw error;

            onItemCreated();
            onClose();

            // Reset form
            setItemName('');
            setDescription('');
            setLocation('');
            setPrice('');
            setIsNegotiable(false);
            setGiveAwayBy('');
            setImageFile(null);

        } catch (error) {
            console.error('Error creating item:', error);
            alert('Failed to create listing. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        List an Item
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="mp-image-upload"
                            />
                            <label
                                htmlFor="mp-image-upload"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center gap-2 w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden ${isDragging
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400'
                                    }`}
                            >
                                {imageFile ? (
                                    <div className="relative w-full h-full group">
                                        <img
                                            src={URL.createObjectURL(imageFile)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-medium text-sm">Click to change</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                                            <Upload size={24} className={isDragging ? 'text-indigo-500' : 'text-gray-400'} />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Upload a file</span>
                                            <span className="text-sm text-gray-500"> or drag and drop</span>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name</label>
                        <input
                            type="text"
                            required
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. Vintage Lamp"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="0 for Free"
                                />
                            </div>
                        </div>
                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isNegotiable}
                                    onChange={(e) => setIsNegotiable(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Or Best Offer / Negotiable</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Give Away By (Deadline) *</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />

                            {/* Visible Input (Formatted) */}
                            <input
                                type="text"
                                readOnly
                                placeholder="MM/DD/YYYY"
                                value={giveAwayBy ? (() => {
                                    const [y, m, d] = giveAwayBy.split('-');
                                    return `${m}/${d}/${y}`;
                                })() : ''}
                                onClick={() => dateInputRef.current?.showPicker()}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all cursor-pointer"
                            />

                            {/* Hidden Date Input */}
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={giveAwayBy}
                                onChange={(e) => setGiveAwayBy(e.target.value)}
                                className="absolute w-0 h-0 opacity-0 bottom-0 left-0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location / Pickup (Optional)</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. Lobby, Apt 4B"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Email</label>
                        <input
                            type="email"
                            required
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="your@email.com"
                        />
                        <p className="mt-1 text-xs text-gray-500">Shared with interested neighbors when they click "Message"</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-24"
                            placeholder="Condition, dimensions, reason for giving away..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Post Item'}
                    </button>
                </form>
            </div>
        </div>
    );
}
