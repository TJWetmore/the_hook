import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { api, type Profile, type Campaign, type ForumPost, type PackageReport, type UserActivity, type Poll, type Event, type MarketplaceItem } from './lib/api';
import { formatDate } from './lib/utils';
import { LayoutGrid, MessageSquare, Package, Calendar, Tag, LogOut, Search, Plus, User, BarChart2, ThumbsUp, RotateCw, ShoppingBag, ShieldAlert, Shield } from 'lucide-react';
import AuthModal from './components/AuthModal';
import EventsView from './components/EventsView';
import PerksView from './components/PerksView';
import DevSupportView from './components/DevSupportView';
import CreatePostModal from './components/CreatePostModal';
import ReportPackageModal from './components/ReportPackageModal';
import PackageDetailModal from './components/PackageDetailModal';
import PollsView from './components/PollsView';
import PostDetailModal from './components/PostDetailModal';
import MarketplaceView from './components/MarketplaceView';
import CreateMarketplaceItemModal from './components/CreateMarketplaceItemModal';
import MarketplaceItemDetailModal from './components/MarketplaceItemDetailModal';
import LandingPage from './components/LandingPage';
import VerificationPendingView from './components/VerificationPendingView';
import Watermark from './components/Watermark';
import BlockedUserView from './components/BlockedUserView';
import AdminUserView from './components/AdminUserView';

function App() {
  const [activeTab, setActiveTab] = useState('forum');
  const [activeFilter, setActiveFilter] = useState('All');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);

  // Modal States
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isReportPackageOpen, setIsReportPackageOpen] = useState(false);
  const [isCreateMarketplaceItemOpen, setIsCreateMarketplaceItemOpen] = useState(false);
  const [reportPackageType, setReportPackageType] = useState<'found' | 'missing'>('found');

  // Data States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<MarketplaceItem | null>(null);
  const [packages, setPackages] = useState<PackageReport[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageReport | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [packageSearch, setPackageSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Record<string, number>>({});

  // Activity & Badges
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [unreadForum, setUnreadForum] = useState(0);
  const [unreadEvents, setUnreadEvents] = useState(0);
  const [unreadPackages, setUnreadPackages] = useState(0);

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsAuthCheckComplete(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const data = await api.fetchProfile(userId);
    if (data) setProfile(data);
    setIsAuthCheckComplete(true);
  };

  // fetches the last time the user was active on each tab
  const fetchUserActivity = async (userId: string) => {
    const data = await api.fetchUserActivity(userId);
    if (data) setUserActivity(data);
  };

  const updateLastSeen = async (tab: string) => {
    if (!user) return;

    // Optimistic update
    const now = new Date().toISOString();
    const field = `last_seen_${tab} `;

    if (userActivity) {
      setUserActivity({ ...userActivity, [field as keyof UserActivity]: now });
      if (tab === 'forum') setUnreadForum(0);
      if (tab === 'events') setUnreadEvents(0);
      if (tab === 'packages') setUnreadPackages(0);
    }

    await api.updateLastSeen(user.id, tab);
  };

  // Fetch badges (counts of new items)
  const fetchBadges = useCallback(async () => {
    if (!userActivity) return;
    const badges = await api.fetchBadges(userActivity);
    setUnreadForum(badges.unreadForum);
    setUnreadEvents(badges.unreadEvents);
    setUnreadPackages(badges.unreadPackages);
  }, [userActivity]);

  useEffect(() => {
    if (user) {
      fetchUserActivity(user.id);
    }
  }, [user]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // 2. Data Fetching based on Tab
  const fetchData = useCallback(async (force = false) => {
    // Cache check (5 minutes)
    if (!force && lastFetched[activeTab] && Date.now() - lastFetched[activeTab] < 300000) {
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await api.fetchCampaigns();
        if (data) setCampaigns(data);
      } else if (activeTab === 'forum') {
        const data = await api.fetchPosts();
        if (data) setPosts(data);
      } else if (activeTab === 'packages') {
        const data = await api.fetchPackages(true); // Filter old packages
        if (data) setPackages(data);
      } else if (activeTab === 'polls') {
        const data = await api.fetchPolls(null); // Fetch all polls
        if (data) setPolls(data);
      } else if (activeTab === 'events') {
        const { data } = await supabase.from('events').select('*').order('start_time', { ascending: true });
        if (data) setEvents(data);
      } else if (activeTab === 'marketplace') {
        const data = await api.fetchMarketplaceItems(true);
        if (data) setMarketplaceItems(data);
      }

      // Update cache timestamp
      setLastFetched(prev => ({ ...prev, [activeTab]: Date.now() }));

      // Events and Perks fetch their own data
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, lastFetched]); // Depend on lastFetched to check it, but be careful of loops. 
  // Actually, lastFetched in dependency might cause loop if we set it inside.
  // But we only set it if we fetch.
  // Better to use ref for lastFetched if we don't want re-renders, but we want re-renders to update UI if needed?
  // No, state is fine.
  // Wait, if I add lastFetched to dependency, and I update it, fetchData changes.
  // But useEffect depends on fetchData. So useEffect runs again.
  // Then fetchData runs. It checks cache. Cache is fresh. It returns.
  // So loop is broken by cache check. Safe.

  useEffect(() => {
    fetchData();
  }, [fetchData, user]);

  const handleMarketplaceLike = async (item: MarketplaceItem) => {
    if (!user) return;

    // Optimistic update
    setMarketplaceItems(prev => prev.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          like_count: i.is_liked_by_me ? i.like_count - 1 : i.like_count + 1,
          is_liked_by_me: !i.is_liked_by_me
        };
      }
      return i;
    }));

    // If the modal is open with this item, update it too reference-wise if needed, 
    // but since we pass selectedMarketplaceItem from state (which might be stale if we don't update it),
    // we should ensure selectedMarketplaceItem is also updated or derived from marketplaceItems.
    // However, for simplicity, let's just update the list. 
    // If the modal takes the item object directly, we might need to update the selected item state too.
    if (selectedMarketplaceItem && selectedMarketplaceItem.id === item.id) {
      setSelectedMarketplaceItem(prev => prev ? ({
        ...prev,
        like_count: prev.is_liked_by_me ? prev.like_count - 1 : prev.like_count + 1,
        is_liked_by_me: !prev.is_liked_by_me
      }) : null);
    }

    try {
      await api.toggleMarketplaceItemLike(item.id, user.id);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error would be ideal, but keeping it simple for now
      fetchData(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleUsefulClick = async (e: React.MouseEvent, post: ForumPost) => {
    e.stopPropagation();
    if (!user) return;

    // Optimistic update
    setPosts(currentPosts => currentPosts.map(p => {
      if (p.id !== post.id) return p;
      return {
        ...p,
        upvotes: p.is_useful ? p.upvotes - 1 : p.upvotes + 1,
        is_useful: !p.is_useful
      };
    }));

    // Also update selectedPost if it's open
    if (selectedPost && selectedPost.id === post.id) {
      setSelectedPost(prev => prev ? ({
        ...prev,
        upvotes: prev.is_useful ? prev.upvotes - 1 : prev.upvotes + 1,
        is_useful: !prev.is_useful
      }) : null);
    }

    try {
      await api.togglePostUseful(post.id, user.id);
    } catch (error) {
      console.error('Error toggling useful:', error);
      fetchData(); // Revert on error
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return;

    // Optimistic update
    setPolls(currentPolls => currentPolls.map(poll => {
      if (poll.id !== pollId) return poll;

      const oldVoteOptionId = poll.my_vote;
      const newOptions = poll.options.map(opt => {
        let count = opt.vote_count || 0;
        if (opt.id === oldVoteOptionId) count--;
        if (opt.id === optionId) count++;
        return { ...opt, vote_count: count };
      });

      return {
        ...poll,
        options: newOptions,
        my_vote: optionId,
        total_votes: (poll.total_votes || 0) + (oldVoteOptionId ? 0 : 1)
      };
    }));

    try {
      const { error } = await api.castVote(pollId, optionId, user.id);
      if (error) throw error;
    } catch (error) {
      console.error('Error casting vote:', error);
      fetchData(true); // Revert on error
    }
  };

  const NavItem = ({ id, label, icon: Icon, badge }: { id: string, label: string, icon: any, badge?: number }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        updateLastSeen(id);
      }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === id
        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        } `}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  // Loading State
  // We also show loading if user is logged in but profile hasn't loaded yet
  // This prevents the "Flash of Content" where the app renders before we know if they are verified
  if (!isAuthCheckComplete || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Not Logged In -> Landing Page
  if (!user) {
    return (
      <>
        <LandingPage onSignIn={() => setIsAuthModalOpen(true)} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </>
    );
  }

  // Logged In BUT Not Verified -> Verification Pending
  // (We assume if profile is null but user exists, we are still fetching or it's a fresh user, 
  // but for safety we can show pending or a loader if profile is crucial. 
  // Let's assume fetchProfile logic handles this, but since we set isAuthCheckComplete only after fetchProfile, 
  // we check profile here.)
  if (profile && !profile.is_verified) {
    return <VerificationPendingView
      onLogout={handleLogout}
      onRefresh={() => {
        setProfile(null); // Force loading state to show progress
        setIsAuthCheckComplete(false); // Reset check to trigger loading UI if desired, or just let setProfile(null) trigger the "user && !profile" loader
        if (user) fetchProfile(user.id);
      }}
      userName={profile.user_name}
    />;
  }

  // Blocked User -> Blocked View
  if (profile && profile.role === 'blocked') {
    return <BlockedUserView />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 hidden md:flex flex-col p-6">
        <div className="flex items-center gap-2 mb-10 px-2">
          <img src="/favicon.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-xl font-bold tracking-tight text-green-900 dark:text-green-100">The Hook</span>
        </div>

        <nav className="space-y-8 flex-1">
          <div>
            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Community</h3>
            <div className="space-y-1">
              <NavItem id="forum" label="Discussion" icon={MessageSquare} badge={unreadForum > 0 ? unreadForum : undefined} />
              <NavItem id="polls" label="Polls" icon={BarChart2} />
              <NavItem id="packages" label="Package Watch" icon={Package} badge={unreadPackages > 0 ? unreadPackages : undefined} />
              <NavItem id="events" label="Events" icon={Calendar} badge={unreadEvents > 0 ? unreadEvents : undefined} />
            </div>
          </div>

          <div>
            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Deals</h3>
            <div className="space-y-1">
              {/* <NavItem id="dashboard" label="Bulk Buys" icon={LayoutGrid} /> */}
              <NavItem id="marketplace" label="Marketplace" icon={ShoppingBag} />
              <NavItem id="perks" label="Local Perks" icon={Tag} />
            </div>
          </div>

          <div>
            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Support</h3>
            <div className="space-y-1">
              <NavItem id="dev-support" label="Dev Support" icon={RotateCw} />
            </div>
          </div>

          {profile?.role === 'admin' && (
            <div>
              <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Admin</h3>
              <div className="space-y-1">
                <NavItem id="admin" label="Users" icon={Shield} />
              </div>
            </div>
          )}
        </nav>

        {/* User Profile in Sidebar */}
        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
          {user ? (
            <div className="flex items-center gap-3 px-2">
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
                alt="Avatar"
                className="w-10 h-10 rounded-full bg-gray-100"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{profile?.user_name || 'Resident'}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.coop_name || 'Unverified'}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600">
                <LogOut size={18} />
              </button>
            </div >
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Sign In
            </button>
          )
          }
        </div >
      </aside >

      {/* Mobile Header (Visible only on small screens) */}
      < div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40 flex items-center justify-between px-4" >
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-green-900 dark:text-green-100">The Hook</span>
        </div>
        <button onClick={() => setIsAuthModalOpen(true)} className="p-2">
          <User size={24} />
        </button>
      </div >

      {/* Main Content */}
      < main className="flex-1 p-8 md:p-12 overflow-y-auto mt-16 md:mt-0" >
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          {/* Limited User Banner */}
          {profile?.role === 'limited' && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3 text-orange-800">
              <div className="p-2 bg-orange-100 rounded-full">
                <ShieldAlert size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Account Limited</p>
                <p className="text-sm">Your account is currently limited - you can view posts but cannot comment or create posts. You can still report missing packages.</p>
              </div>
            </div>
          )}

          {/* Search Bar (Mock) */}
          <div className="mb-8 flex justify-end gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search topics..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={() => fetchData(true)}
              className="p-2 text-gray-400 hover:text-green-600 transition-colors bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              title="Refresh"
            >
              <RotateCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="space-y-6 flex-1">
              {/* VIEWS */}
              {activeTab === 'events' && <EventsView events={events} onRefresh={() => fetchData(true)} canInteract={profile?.role !== 'limited'} />}
              {activeTab === 'perks' && <PerksView />}
              {activeTab === 'polls' && <PollsView polls={polls} onRefresh={() => fetchData(true)} onVote={handleVote} canInteract={profile?.role !== 'limited'} />}
              {activeTab === 'marketplace' &&
                <MarketplaceView
                  user={user}
                  items={marketplaceItems}
                  onOpenCreate={() => setIsCreateMarketplaceItemOpen(true)}
                  canCreate={profile?.role !== 'limited'}
                  onItemClick={(item) => setSelectedMarketplaceItem(item)}
                  onLikeToggle={handleMarketplaceLike}
                />
              }
              {activeTab === 'dev-support' && <DevSupportView user={user} canInteract={profile?.role !== 'limited'} />}
              {activeTab === 'admin' && profile?.role === 'admin' && <AdminUserView />}

              {activeTab === 'dashboard' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Buys</h2>
                    <p className="text-gray-500">Purchasing power for the 1,000+ units of Corlears Hook.</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl">
                            {campaign.image_url ? '🎄' : '❄️'}
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">Active</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">{campaign.campaign_name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{campaign.description}</p>

                        <div className="flex justify-between items-end mb-2">
                          <span className="text-green-700 font-bold text-xs">{campaign.current_pledges} pledged</span>
                          <span className="text-gray-400 text-xs">Target: {campaign.min_pledges_needed}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-6">
                          <div
                            className="bg-green-600 h-full rounded-full"
                            style={{ width: `${Math.min((campaign.current_pledges / campaign.min_pledges_needed) * 100, 100)}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="block text-xl font-bold">${campaign.price_per_unit}</span>
                            <span className="text-xs text-gray-400">est.</span>
                          </div>
                          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm">
                            Pledge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'forum' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Community Board</h2>
                      <p className="text-gray-500">Ask neighbors, recommend vendors, or vent (politely).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user && profile?.role !== 'limited' && (
                        <button
                          onClick={() => setIsCreatePostOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                        >
                          <Plus size={16} />
                          <span>New Post</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Chips */}
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['All', 'Vendor Review', 'Renovation'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeFilter === filter
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {!user && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-lg text-center text-sm text-indigo-800 dark:text-indigo-200">
                        Sign in to view private discussions and post comments.
                      </div>
                    )}
                    {posts
                      .filter(post => activeFilter === 'All' || post.category === activeFilter)
                      .filter(post => activeFilter === 'All' || post.category === activeFilter)
                      .map((post) => (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${post.category === 'Vendor Review' ? 'bg-blue-100 text-blue-700' :
                              post.category === 'Renovation' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {post.category}
                            </span>
                            <span className="text-xs text-gray-400">• {formatDate(post.created_at)}</span>
                          </div>
                          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{post.post_name}</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">{post.content}</p>

                          <div className="mt-4 flex items-center gap-4 text-gray-400 text-xs font-medium">
                            <span className="flex items-center gap-1"><MessageSquare size={14} /> {post.reply_count || 0} replies</span>
                            <button
                              onClick={(e) => handleUsefulClick(e, post)}
                              className={`flex items-center gap-1 hover:text-green-600 transition-colors ${post.is_useful ? 'text-green-600 font-bold' : ''}`}
                            >
                              <ThumbsUp size={14} className={post.is_useful ? 'fill-current' : ''} />
                              {post.upvotes} useful
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === 'packages' && (
                <div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Package size={24} /></div>
                        <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">Package Watch</h2>
                      </div>
                      <p className="text-indigo-700 dark:text-indigo-300">Misdelivered package? Post it here to help your neighbors.</p>
                    </div>
                    {user && (
                      <button
                        onClick={() => {
                          setReportPackageType('found');
                          setIsReportPackageOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap"
                      >
                        Report Package
                      </button>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search last 4 tracking number digits..."
                        value={packageSearch}
                        onChange={(e) => setPackageSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {packages
                      .filter(pkg => !packageSearch || pkg.package_digits?.includes(packageSearch))
                      .map((pkg) => (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start justify-between cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex gap-4">
                            {pkg.image_url ? (
                              <img
                                src={pkg.image_url}
                                alt="Package"
                                className="w-20 h-20 rounded-lg object-cover border border-gray-100"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${pkg.report_type === 'found' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}>
                                <Package size={24} />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold uppercase tracking-wider ${pkg.report_type === 'found' ? 'text-green-600' : 'text-red-600'
                                  }`}>{pkg.report_type}</span>
                                <span className="text-gray-400 text-xs">• {new Date(pkg.created_at).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                {pkg.is_food && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1">
                                    🍔 Food
                                  </span>
                                )}
                                {pkg.package_digits && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono font-bold rounded-md">
                                    #{pkg.package_digits}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-gray-900 dark:text-white">{pkg.item_description}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {pkg.report_type === 'found' ? `Left in ${pkg.location_found}` : `Last seen at ${pkg.location_found}`}
                              </p>
                            </div>
                          </div>
                          {pkg.report_type === 'found' && (
                            <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-colors">
                              Claim
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}


          <footer className="mt-auto border-t border-gray-100 dark:border-gray-800 pt-8 pb-4 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © 2025 The Hook. All rights reserved. The Hook is an independent community project. Not affiliated with East River Housing Corporation.
            </p>
          </footer>
        </div>
      </main >

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => fetchData(true)}
      />
      <ReportPackageModal
        isOpen={isReportPackageOpen}
        onClose={() => setIsReportPackageOpen(false)}
        onReportCreated={() => fetchData(true)}
        initialStatus={reportPackageType}
      />
      <PackageDetailModal
        pkg={selectedPackage}
        onClose={() => setSelectedPackage(null)}
        onResolve={() => fetchData(true)}
        currentUserId={user?.id}
        canComment={profile?.role !== 'limited'}
      />
      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        currentUserId={user?.id}
        canComment={profile?.role !== 'limited'}
      />
      <CreateMarketplaceItemModal
        isOpen={isCreateMarketplaceItemOpen}
        onClose={() => setIsCreateMarketplaceItemOpen(false)}
        onItemCreated={() => fetchData(true)}
      />

      <MarketplaceItemDetailModal
        item={selectedMarketplaceItem}
        onClose={() => setSelectedMarketplaceItem(null)}
        onLikeToggle={() => selectedMarketplaceItem && handleMarketplaceLike(selectedMarketplaceItem)}
        onView={() => {
          if (selectedMarketplaceItem) {
            setMarketplaceItems(prev => prev.map(i =>
              i.id === selectedMarketplaceItem.id
                ? { ...i, view_count: i.view_count + 1 }
                : i
            ));
          }
        }}
        currentUserId={user?.id}
        onStatusUpdate={(status) => {
          if (selectedMarketplaceItem) {
            setMarketplaceItems(prev => prev.map(i => i.id === selectedMarketplaceItem.id ? { ...i, status } : i));
            setSelectedMarketplaceItem(null);
          }
        }}
        canComment={profile?.role !== 'limited'}
      />

      {/* Mobile Bottom Nav (Optional, but good for mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-2 z-40">
        <button onClick={() => setActiveTab('forum')} className={`p-2 rounded-lg ${activeTab === 'forum' ? 'text-green-600' : 'text-gray-400'}`}><MessageSquare size={24} /></button>
        <button onClick={() => setActiveTab('polls')} className={`p-2 rounded-lg ${activeTab === 'polls' ? 'text-green-600' : 'text-gray-400'}`}><BarChart2 size={24} /></button>
        <button onClick={() => setActiveTab('events')} className={`p-2 rounded-lg ${activeTab === 'events' ? 'text-green-600' : 'text-gray-400'}`}><Calendar size={24} /></button>
        <button onClick={() => setActiveTab('packages')} className={`p-2 rounded-lg ${activeTab === 'packages' ? 'text-green-600' : 'text-gray-400'}`}><Package size={24} /></button>
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-green-600' : 'text-gray-400'}`}><LayoutGrid size={24} /></button>
      </div>

      {user && <Watermark text={user.id} />}
    </div >
  );
}

export default App;
