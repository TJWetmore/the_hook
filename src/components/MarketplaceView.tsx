import { type MarketplaceItem } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Plus, Tag, Calendar, MapPin, ImageOff, Eye, Heart, ShoppingBag } from 'lucide-react';

interface MarketplaceViewProps {
    user: any;
    items: MarketplaceItem[];
    onOpenCreate: () => void;
    onItemClick: (item: MarketplaceItem) => void;
    onLikeToggle: (item: MarketplaceItem) => void;
    canCreate?: boolean;
}

interface ItemGridProps {
    items: MarketplaceItem[];
    title?: string;
    isNewSection?: boolean;
    onItemClick: (item: MarketplaceItem) => void;
    onLikeToggle: (item: MarketplaceItem) => void;
}

const ItemGrid = ({ items, title, isNewSection = false, onItemClick, onLikeToggle }: ItemGridProps) => (
    <div className="mb-12 last:mb-0">
        {title && (
            <div className="flex items-center gap-2 mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{title}</h3>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer group"
                    onClick={() => onItemClick(item)}
                >
                    <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-700">
                        {item.image_url ? (
                            <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageOff size={48} />
                            </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                            {isNewSection && (
                                <span className="px-2 py-1 bg-indigo-600/90 backdrop-blur-sm rounded-lg text-xs font-bold shadow-sm text-white">
                                    NEW
                                </span>
                            )}
                            <span className="px-2 py-1 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-lg text-xs font-bold shadow-sm text-gray-900 dark:text-white">
                                {item.price ? `$${item.price}${item.is_negotiable ? ' OBO' : ''}` : 'FREE'}
                            </span>
                        </div>
                        {item.status !== 'available' && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                                <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg shadow-lg uppercase tracking-wider transform -rotate-12">
                                    {item.status.replace('_', ' ')}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 line-clamp-1">{item.item_name}</h3>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                            {item.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={14} />
                                    <span className="truncate max-w-[100px]">{item.location}</span>
                                </span>
                            )}
                            <span className={`flex items-center gap-1 ${item.status === 'available' && !isNewSection && item.give_away_by && new Date(item.give_away_by) < new Date(Date.now() + 86400000 * 3) ? 'text-orange-600 font-medium' : ''}`}>
                                <Calendar size={14} />
                                <span>{item.give_away_by ? formatDate(item.give_away_by) : 'No date'}</span>
                            </span>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <img
                                    src={item.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user_id}`}
                                    alt="Avatar"
                                    className="w-6 h-6 rounded-full bg-gray-100"
                                />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                                    {item.profile?.user_name || 'Neighbor'}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-gray-400 text-xs">
                                    <Eye size={14} />
                                    <span>{item.view_count}</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLikeToggle(item);
                                    }}
                                    className={`flex items-center gap-1 text-xs font-bold transition-colors ${item.is_liked_by_me
                                        ? 'text-pink-600 dark:text-pink-400'
                                        : 'text-gray-400 hover:text-pink-600 dark:hover:text-pink-400'
                                        }`}
                                >
                                    <Heart size={14} className={item.is_liked_by_me ? 'fill-current' : ''} />
                                    <span>{item.like_count}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default function MarketplaceView({ items, onOpenCreate, onItemClick, onLikeToggle, canCreate = true }: MarketplaceViewProps) {
    const [newItems, expiringItems] = items.reduce<[MarketplaceItem[], MarketplaceItem[]]>((acc, item) => {
        const createdDate = new Date(item.created_at);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        // Only count as "new" if it's available
        if (createdDate > sixHoursAgo && item.status === 'available') {
            acc[0].push(item);
        } else {
            acc[1].push(item);
        }
        return acc;
    }, [[], []]);

    // Sort expiring items by deadline (soonest first)
    expiringItems.sort((a, b) => {
        // Put sold/given away items at the bottom
        if (a.status !== 'available' && b.status === 'available') return 1;
        if (a.status === 'available' && b.status !== 'available') return -1;

        if (!a.give_away_by) return 1;
        if (!b.give_away_by) return -1;
        return new Date(a.give_away_by).getTime() - new Date(b.give_away_by).getTime();
    });

    return (
        <div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><ShoppingBag size={24} /></div>
                        <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">Marketplace</h2>
                    </div>
                    <p className="text-indigo-700 dark:text-indigo-300">Give away things you don't need, or find hidden gems from your neighbors.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={onOpenCreate}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                        <Plus size={20} />
                        Give/Sell Item
                    </button>
                )}
            </div>

            {newItems.length > 0 && (
                <ItemGrid
                    items={newItems}
                    title="New Arrivals"
                    isNewSection={true}
                    onItemClick={onItemClick}
                    onLikeToggle={onLikeToggle}
                />
            )}

            {(expiringItems.length > 0 || newItems.length === 0) && (
                <ItemGrid
                    items={expiringItems}
                    title={newItems.length > 0 ? "Expiring Soon" : undefined}
                    onItemClick={onItemClick}
                    onLikeToggle={onLikeToggle}
                />
            )}

            {items.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Tag size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No items listed yet</h3>
                    <p>Be the first to give something away!</p>
                </div>
            )}
        </div>
    );
}
