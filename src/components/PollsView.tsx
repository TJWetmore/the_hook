import { useState, useEffect } from 'react';
import { type Poll } from '../lib/api';
import { formatDate } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import { Plus, BarChart2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import CreatePollModal from './CreatePollModal';
import PollDetailModal from './PollDetailModal';

interface PollsViewProps {
    polls: Poll[];
    onRefresh: () => void;
    onVote: (pollId: string, optionId: string) => Promise<void>;
    canInteract?: boolean;
    isAdmin?: boolean;
}

export default function PollsView({ polls, onRefresh, onVote, canInteract = true, isAdmin = false }: PollsViewProps) {
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    }, []);

    // Filter polls based on active tab
    const filteredPolls = polls.filter(poll => {
        const now = new Date().toISOString();
        if (activeTab === 'active') return poll.closes_at > now;
        return poll.closes_at <= now;
    });

    const handleVoteClick = async (pollId: string, optionId: string) => {
        if (!user) return;
        await onVote(pollId, optionId);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Community Polls</h2>
                    <p className="text-gray-500">Vote on community decisions and see what your neighbors think.</p>
                </div>
                {user && canInteract && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                    >
                        <Plus size={16} />
                        <span>Create Poll</span>
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'active'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Active Polls
                    {activeTab === 'active' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'past'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Past Results
                    {activeTab === 'past' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
                    )}
                </button>
            </div>

            <div className="space-y-6">
                {filteredPolls.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <BarChart2 className="mx-auto text-gray-300 mb-3" size={48} />
                        <p className="text-gray-500 font-medium">No {activeTab} polls found.</p>
                    </div>
                )}

                {filteredPolls.map((poll) => (
                    <div key={poll.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div
                            className="flex justify-between items-start mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedPollId(poll.id)}
                        >
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{poll.question}</h3>
                                {poll.description && (
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">{poll.description}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full">
                                <Clock size={14} />
                                {activeTab === 'active' ? (
                                    <span>Closes {formatDate(poll.closes_at)}</span>
                                ) : (
                                    <span>Closed {formatDate(poll.closes_at)}</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {poll.options.map((option) => {
                                const percentage = poll.total_votes ? Math.round(((option.vote_count || 0) / poll.total_votes) * 100) : 0;
                                const isSelected = poll.my_vote === option.id;
                                const isWinner = activeTab === 'past' && Math.max(...poll.options.map(o => o.vote_count || 0)) === option.vote_count && (option.vote_count || 0) > 0;

                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => activeTab === 'active' && canInteract && handleVoteClick(poll.id, option.id)}
                                        disabled={activeTab === 'past' || !user || !canInteract}
                                        className={`w-full relative group overflow-hidden rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                            : canInteract ? 'border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 bg-white dark:bg-gray-800' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-70 cursor-not-allowed'
                                            }`}
                                    >
                                        {/* Progress Bar Background */}
                                        {(activeTab === 'past' || isSelected) && (
                                            <div
                                                className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${isWinner ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'
                                                    }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        )}

                                        <div className="relative p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                                    ? 'border-indigo-600 bg-indigo-600'
                                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                                <div className="text-left">
                                                    <span className={`block font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {option.option_text}
                                                    </span>
                                                    {option.description && (
                                                        <span className="text-xs text-gray-500">{option.description}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {(activeTab === 'past' || isSelected) && (
                                                <div className="flex items-center gap-2">
                                                    {isWinner && <CheckCircle2 size={16} className="text-green-600" />}
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{percentage}%</span>
                                                    <span className="text-xs text-gray-500">({option.vote_count} votes)</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500">
                            <span>{poll.total_votes} total votes</span>
                            {!user && activeTab === 'active' && (
                                <span className="flex items-center gap-1 text-amber-600">
                                    <AlertCircle size={12} />
                                    Sign in to vote
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <CreatePollModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onPollCreated={onRefresh}
            />

            {selectedPollId && (
                <PollDetailModal
                    pollId={selectedPollId}
                    onClose={() => setSelectedPollId(null)}
                    currentUserId={user?.id}
                    canComment={canInteract}
                    isAdmin={isAdmin}
                    onDelete={() => {
                        onRefresh();
                        setSelectedPollId(null);
                    }}
                />
            )}
        </div>
    );
}
