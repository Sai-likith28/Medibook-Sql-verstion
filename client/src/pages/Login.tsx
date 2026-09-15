import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Input from '../components/Input';
import Button from '../components/Button';
import { Shield, User, Lock, AlertCircle, Stethoscope, UserCheck, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const { login, user: currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const from = (location.state as any)?.from?.pathname || '/';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!loginId.trim() || !password.trim()) {
            setErrorMsg('Please enter both Login ID and Password.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                loginId: loginId.trim(),
                password: password.trim()
            });

            const { token, user } = response.data;
            login(token, user);
            toast.success(`Welcome back, ${user.name || user.loginId}!`);

            // Role-based post-login redirection
            if (from && from !== '/' && from !== '/login') {
                navigate(from, { replace: true });
            } else if (user.role === 'ADMIN') {
                navigate('/admin/reports', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const prefillCredentials = (id: string, pass: string) => {
        setLoginId(id);
        setPassword(pass);
        setErrorMsg(null);
    };

    return (
        <div className="max-w-md mx-auto py-8 px-4 sm:px-6">
            {/* Header Brand */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 border border-blue-100 text-blue-600 mb-3 shadow-sm">
                    <Shield className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">MediBook 2.0</h1>
                <p className="text-sm font-medium text-gray-500 mt-1">Healthcare Management Platform Portal</p>
            </div>

            {/* Login Card */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-5 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Account Login
                </h2>

                {currentUser ? (
                    <div className="space-y-4 text-center py-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Currently Signed In</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{currentUser.name || currentUser.loginId}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Role: <span className="font-semibold text-blue-700">{currentUser.role}</span></p>
                        </div>
                        <Button className="w-full" onClick={() => navigate('/')}>
                            Continue to Home
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-5">
                        {errorMsg && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2.5">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <Input
                            label="Login Identifier (Patient ID / Doctor Code / Admin)"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            placeholder="e.g. P-000001, D-000001, or admin"
                            autoFocus
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                        />

                        <Button type="submit" className="w-full justify-center py-2.5" isLoading={loading}>
                            <Lock className="w-4 h-4 mr-2" />
                            Sign In to Account
                        </Button>
                    </form>
                )}

                {/* Development Account Quick Prefills */}
                <div className="mt-8 pt-5 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Development Demo Credentials (Click to Prefill):
                    </p>
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => prefillCredentials('P-000001', 'patient123')}
                            className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs text-gray-700"
                        >
                            <span className="flex items-center gap-1.5 font-medium">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Patient: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-900">P-000001</code>
                            </span>
                            <span className="text-gray-400 font-mono text-[11px]">patient123</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => prefillCredentials('D-000001', 'doctor123')}
                            className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs text-gray-700"
                        >
                            <span className="flex items-center gap-1.5 font-medium">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-600" /> Doctor: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-900">D-000001</code>
                            </span>
                            <span className="text-gray-400 font-mono text-[11px]">doctor123</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => prefillCredentials('admin', 'admin123')}
                            className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs text-gray-700"
                        >
                            <span className="flex items-center gap-1.5 font-medium">
                                <ShieldAlert className="w-3.5 h-3.5 text-blue-600" /> Admin: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-900">admin</code>
                            </span>
                            <span className="text-gray-400 font-mono text-[11px]">admin123</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
