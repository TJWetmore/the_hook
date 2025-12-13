import { LogIn } from 'lucide-react';

interface LandingPageProps {
    onSignIn: () => void;
}

export default function LandingPage({ onSignIn }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-indigo-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="mx-auto w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 overflow-hidden">
                    <img src="/favicon.jpg" alt="The Hook Logo" className="w-full h-full object-cover" />
                </div>

                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                    The Hook
                </h1>

                <p className="text-lg text-gray-600 leading-relaxed">
                    An independent community hub for the Corlears Hook Community. Connect with neighbors, discover local events, find lost packages, and get the best local deals.
                </p>

                <div className="pt-4">
                    <button
                        onClick={onSignIn}
                        className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                    >
                        <LogIn className="group-hover:translate-x-1 transition-transform" />
                        Sign In to Join
                    </button>
                    <p className="mt-4 text-sm text-gray-500">
                        Verification required.
                    </p>
                </div>
            </div>

            <div className="fixed bottom-4 text-xs text-gray-400 text-center px-4">
                &copy; {new Date().getFullYear()} The Hook. All rights reserved. The Hook is an independent community project. Not affiliated with East River Housing Corporation.
            </div>
        </div>
    );
}
