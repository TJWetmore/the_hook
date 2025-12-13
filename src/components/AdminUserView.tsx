import { useState, useEffect } from 'react';
import { api, type AdminUser } from '../lib/api';
import { Shield, CheckCircle2, XCircle, Search, User } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function AdminUserView() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const data = await api.fetchAdminUsers();
        if (data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const handleRoleUpdate = async (userId: string, newRole: 'admin' | 'full' | 'limited' | 'blocked') => {
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

        const { error } = await api.updateUserRole(userId, newRole);
        if (error) {
            console.error('Failed to update role', error);
            // Revert on failure
            loadUsers();
            alert('Failed to update role');
        }
    };

    const handleVerificationToggle = async (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: newStatus } : u));

        const { error } = await api.updateUserVerification(userId, newStatus);
        if (error) {
            console.error('Failed to update verification', error);
            loadUsers();
            alert('Failed to update verification');
        }
    };

    const filteredUsers = users
        .filter(u =>
            (u.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.coop_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Shield className="text-indigo-600" />
                        User Management
                    </h2>
                    <p className="text-gray-500 mt-1">Manage user roles and verification status.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                        />
                    </div>
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Sort: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                        </div>
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No users found used '{searchQuery}'</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-500 overflow-hidden">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white">{user.user_name || 'Unknown User'}</div>
                                                    <div className="text-xs text-gray-500">{user.email || 'No Email'}</div>
                                                    <div className="text-xs text-indigo-600">{(user.coop_name || 'No Coop') + ' • ' + (user.unit_number || 'No Unit')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleUpdate(user.id, e.target.value as any)}
                                                className={`text-sm rounded-lg px-2 py-1 border-0 ring-1 ring-inset font-medium ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                                                    user.role === 'limited' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                                                        user.role === 'blocked' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                            'bg-green-50 text-green-700 ring-green-600/20'
                                                    } focus:ring-2 focus:ring-indigo-600 cursor-pointer`}
                                            >
                                                <option value="full">Full Access</option>
                                                <option value="limited">Limited</option>
                                                <option value="admin">Admin</option>
                                                <option value="blocked">Blocked</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {user.is_verified ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                        <CheckCircle2 size={12} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                        <XCircle size={12} /> Pending
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {formatDate(user.created_at)}
                                            </div>
                                            {user.last_sign_in_at && (
                                                <div className="text-xs text-gray-500">
                                                    Last seen: {formatDate(user.last_sign_in_at)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleVerificationToggle(user.id, user.is_verified)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${user.is_verified
                                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {user.is_verified ? 'Revoke Verify' : 'Verify User'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
