import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, getRoleBasedRedirect } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check for reason in URL (e.g., session expired)
    const queryParams = new URLSearchParams(location.search);
    const reason = queryParams.get('reason');
    const reasonMessages = {
        session_expired: 'Your session has expired. Please log in again.',
        unauthorized: 'You are not authorized to access that page.'
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            const redirectPath = getRoleBasedRedirect();
            navigate(redirectPath);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black">
            <GlassCard className="w-full max-w-md p-8 space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                    <p className="mt-2 text-gray-400">Sign in to your property dashboard</p>
                </div>

                {(error || (reason && reasonMessages[reason])) && (
                    <div className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 font-medium border ${
                        error ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                    }`}>
                        <AlertCircle className="h-4 w-4" />
                        {error || reasonMessages[reason]}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-300">Password</label>
                            <Link to="/forgot-password" size="sm" className="text-xs text-blue-400 hover:text-blue-300">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <GlassButton
                        type="submit"
                        variant="primary"
                        className="w-full py-3 mt-2"
                        isLoading={isLoading}
                    >
                        Sign In
                    </GlassButton>
                </form>

                <div className="text-center text-sm text-gray-400 pt-2">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                        Register as tenant
                    </Link>
                </div>
            </GlassCard>
        </div>
    );
};

export default Login;
