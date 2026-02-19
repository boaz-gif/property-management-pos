import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Loader2, AlertCircle, CheckCircle, Home } from 'lucide-react';
import GlassCard from '../../../components/ui/GlassCard';
import GlassButton from '../../../components/ui/GlassButton';

const RegisterTenant = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        property_id: '',
        unit: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { registerTenant } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!formData.name || !formData.name.trim()) {
            setError('Name is required');
            return;
        }

        if (!formData.email || !formData.email.trim()) {
            setError('Email is required');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (!formData.property_id || !formData.property_id.trim()) {
            setError('Property ID is required');
            return;
        }

        if (!formData.unit || !formData.unit.trim()) {
            setError('Unit number is required');
            return;
        }

        setIsLoading(true);
        try {
            await registerTenant({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                property_id: formData.property_id,
                unit: formData.unit
            });
            
            setSuccess('Tenant user created successfully!');
            setFormData({ 
                name: '', 
                email: '', 
                password: '', 
                confirmPassword: '',
                property_id: '',
                unit: ''
            });
            
            // Redirect to admin dashboard after 2 seconds
            setTimeout(() => {
                navigate('/admin');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create tenant user');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black">
            <GlassCard className="w-full max-w-md p-8 space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white tracking-tight">Create Tenant User</h2>
                    <p className="mt-2 text-gray-400">Register a new tenant</p>
                </div>
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm flex items-center gap-2 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm flex items-center gap-2 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="text"
                                name="name"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="email"
                                name="email"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="tenant@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Property ID</label>
                            <div className="relative">
                                <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type="text"
                                    name="property_id"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    placeholder="PROP-001"
                                    value={formData.property_id}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Unit Number</label>
                            <div className="relative">
                                <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type="text"
                                    name="unit"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    placeholder="A-101"
                                    value={formData.unit}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="password"
                                name="password"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="password"
                                name="confirmPassword"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <GlassButton
                        type="submit"
                        variant="primary"
                        className="w-full py-3 mt-4"
                        isLoading={isLoading}
                    >
                        Create Tenant User
                    </GlassButton>
                </form>

                <div className="text-center pt-2">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center justify-center gap-2 w-full"
                    >
                        ← Back to Admin Dashboard
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

export default RegisterTenant;
