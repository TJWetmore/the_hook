import { Ban, ShieldX } from 'lucide-react';

export default function BlockedUserView() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Ban className="text-red-600" size={32} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>

                <p className="text-gray-600 mb-8 leading-relaxed">
                    We're sorry, but your account has been blocked from accessing this community.
                    <br /><br />
                    If you believe this is a mistake, please create a new account.
                </p>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <ShieldX size={14} />
                    <span>Account ID: Blocked</span>
                </div>
            </div>
        </div>
    );
}
