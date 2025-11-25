import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Tag, AlertTriangle } from 'lucide-react';

interface Perk {
    id: string;
    business_name: string;
    discount_offer: string;
    category: string;
    active: boolean;
}

export default function PerksView() {
    const [perks, setPerks] = useState<Perk[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPerks = async () => {
            const { data } = await supabase
                .from('perks')
                .select('*')
                .eq('active', true);

            if (data) setPerks(data);
            setLoading(false);
        };

        fetchPerks();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading perks...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Local Perks</h2>
                <p className="text-gray-500 dark:text-gray-400">Show your digital ID at these locations for a discount.</p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex gap-3 items-start">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0" size={20} />
                <div>
                    <h4 className="font-bold text-yellow-800 dark:text-yellow-200 text-sm">Screenshot Mode: FAKE DEALS</h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                        These offers are for illustration purposes only. Do not attempt to redeem.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {perks.map((perk) => (
                    <div key={perk.id} className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-lg transition-shadow relative overflow-hidden group">
                        <div className="absolute top-4 right-4 opacity-10 transform rotate-12 group-hover:opacity-20 transition-opacity">
                            <span className="border-2 border-red-500 text-red-500 px-2 py-1 text-xs font-bold uppercase rounded transform rotate-12 block">
                                Mockup Only
                            </span>
                        </div>

                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4 text-3xl">
                            {perk.category === 'Food' ? '☕️' : perk.category === 'Service' ? '✂️' : '🍷'}
                        </div>

                        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">{perk.business_name}</h3>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{perk.category}</span>

                        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg font-bold text-sm w-full">
                            {perk.discount_offer}
                        </div>

                        <button className="mt-6 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            Tap to redeem
                        </button>
                    </div>
                ))}

                {perks.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <Tag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p>No perks available right now.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
