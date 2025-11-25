import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { LayoutGrid, MessageSquare, Package, Calendar, Tag, LogOut, Search, Plus, User } from 'lucide-react';
import AuthModal from './components/AuthModal';
import EventsView from './components/EventsView';
import PerksView from './components/PerksView';
import CreatePostModal from './components/CreatePostModal';
import ReportPackageModal from './components/ReportPackageModal';

// Types
interface Profile {
  id: string;
  user_name: string;
  coop_name: string;
  is_verified: boolean;
  avatar_url: string;
  building_address: string;
}

interface Campaign {
  id: string;
  campaign_name: string;
  description: string;
  price_per_unit: number;
  current_pledges: number;
  min_pledges_needed: number;
  image_url: string;
}

interface ForumPost {
  id: string;
  post_name: string;
  content: string;
  category: string;
  upvotes: number;
  created_at: string;
  user_id: string; // To check ownership if needed
}

interface PackageReport {
  id: string;
  item_description: string;
  location_found: string;
  status: string;
  created_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modal States
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isReportPackageOpen, setIsReportPackageOpen] = useState(false);
  const [reportPackageType, setReportPackageType] = useState<'found' | 'missing'>('found');

  // Data States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [packages, setPackages] = useState<PackageReport[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  // 2. Data Fetching based on Tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const { data } = await supabase.from('campaigns').select('*');
        if (data) setCampaigns(data);
      } else if (activeTab === 'forum') {
        const { data } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false });
        if (data) setPosts(data);
      } else if (activeTab === 'packages') {
        const { data } = await supabase.from('package_reports').select('*').order('created_at', { ascending: false });
        if (data) setPackages(data);
      }
      // Events and Perks fetch their own data
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]); // Only depend on activeTab (and implicitly supabase/setters)

  useEffect(() => {
    fetchData();
  }, [fetchData, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const NavItem = ({ id, label, icon: Icon, badge }: { id: string, label: string, icon: any, badge?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === id
        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 hidden md:flex flex-col p-6">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center text-white font-bold">
            <span className="text-lg">🌲</span>
            <span className="text-lg">🌲</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-green-900 dark:text-green-100">The Hook</span>
        </div>

        <nav className="space-y-8 flex-1">
          <div>
            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Community</h3>
            <div className="space-y-1">
              <NavItem id="forum" label="Discussion" icon={MessageSquare} />
              <NavItem id="events" label="Events" icon={Calendar} />
              <NavItem id="packages" label="Package Watch" icon={Package} badge={packages.length > 0 ? packages.length : undefined} />
            </div>
          </div>

          <div>
            <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Deals</h3>
            <div className="space-y-1">
              <NavItem id="dashboard" label="Bulk Buys" icon={LayoutGrid} />
              <NavItem id="perks" label="Local Perks" icon={Tag} />
            </div>
          </div>
        </nav>

        {/* User Profile in Sidebar */}
        <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
          {user ? (
            <div className="flex items-center gap-3 px-2">
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
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
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-green-900 dark:text-green-100">The Hook</span>
        </div>
        <button onClick={() => setIsAuthModalOpen(true)} className="p-2">
          <User size={24} />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto mt-16 md:mt-0">
        <div className="max-w-4xl mx-auto">
          {/* Search Bar (Mock) */}
          <div className="mb-8 flex justify-end">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search topics..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* VIEWS */}
              {activeTab === 'events' && <EventsView />}
              {activeTab === 'perks' && <PerksView />}

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
                      {/* Filter Chips */}
                      <div className="hidden sm:flex gap-2 mr-4">
                        <button className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold">All</button>
                        <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200">Vendor Review</button>
                        <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200">Renovation</button>
                      </div>
                      {user && (
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

                  <div className="space-y-4">
                    {!user && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-lg text-center text-sm text-indigo-800 dark:text-indigo-200">
                        Sign in to view private discussions and post comments.
                      </div>
                    )}
                    {posts.map((post) => (
                      <div key={post.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${post.category === 'Vendor Review' ? 'bg-blue-100 text-blue-700' :
                            post.category === 'Renovation' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                            {post.category}
                          </span>
                          <span className="text-xs text-gray-400">• {new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{post.post_name}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">{post.content}</p>

                        <div className="mt-4 flex items-center gap-4 text-gray-400 text-xs font-medium">
                          <span className="flex items-center gap-1"><MessageSquare size={14} /> {Math.floor(Math.random() * 20)} replies</span>
                          <span className="flex items-center gap-1">👍 {post.upvotes} useful</span>
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
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setReportPackageType('found');
                          setIsReportPackageOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors"
                      >
                        Found a Package
                      </button>
                      <button
                        onClick={() => {
                          setReportPackageType('missing');
                          setIsReportPackageOpen(true);
                        }}
                        className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 font-bold rounded-lg text-sm hover:bg-indigo-50 transition-colors"
                      >
                        Report Missing
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${pkg.status === 'found' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                            <Package size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold uppercase tracking-wider ${pkg.status === 'found' ? 'text-green-600' : 'text-red-600'
                                }`}>{pkg.status}</span>
                              <span className="text-gray-400 text-xs">• {new Date(pkg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{pkg.item_description}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {pkg.status === 'found' ? `Left in ${pkg.location_found}` : `Last seen at ${pkg.location_found}`}
                            </p>
                          </div>
                        </div>
                        {pkg.status === 'found' && (
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
        </div>
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={fetchData}
      />
      <ReportPackageModal
        isOpen={isReportPackageOpen}
        onClose={() => setIsReportPackageOpen(false)}
        onReportCreated={fetchData}
        initialStatus={reportPackageType}
      />

      {/* Mobile Bottom Nav (Optional, but good for mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-2 z-40">
        <button onClick={() => setActiveTab('forum')} className={`p-2 rounded-lg ${activeTab === 'forum' ? 'text-green-600' : 'text-gray-400'}`}><MessageSquare size={24} /></button>
        <button onClick={() => setActiveTab('events')} className={`p-2 rounded-lg ${activeTab === 'events' ? 'text-green-600' : 'text-gray-400'}`}><Calendar size={24} /></button>
        <button onClick={() => setActiveTab('packages')} className={`p-2 rounded-lg ${activeTab === 'packages' ? 'text-green-600' : 'text-gray-400'}`}><Package size={24} /></button>
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-green-600' : 'text-gray-400'}`}><LayoutGrid size={24} /></button>
      </div>
    </div>
  );
}

export default App;
