import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

interface VerificationPendingViewProps {
    onLogout: () => void;
    onRefresh: () => void;
    userName?: string;
}

export default function VerificationPendingView({ onLogout, onRefresh, userName }: VerificationPendingViewProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="text-yellow-600" size={32} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Pending</h2>

                <p className="text-gray-600 mb-6">
                    Welcome, <span className="font-semibold">{userName || 'Neighbor'}</span>!
                    <br /><br />
                    Your account is currently waiting for verification from a community administrator. You'll get access to The Hook as soon as we confirm your residency.
                </p>

                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 mb-8 border border-gray-100">
                    This usually takes less than 24 hours. Hang tight!
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onRefresh}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Check Verification Status
                    </button>

                    <button
                        onClick={onLogout}
                        className="text-gray-400 hover:text-gray-600 text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
