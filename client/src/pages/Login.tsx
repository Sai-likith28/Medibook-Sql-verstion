import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { registerPatient } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import { Shield, User, Lock, AlertCircle, Stethoscope, UserCheck, ShieldAlert, UserPlus } from 'lucide-react';

import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const { login, user: currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [mode, setMode] = useState<'login' | 'register'>('login');

    // Login Form State
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');

    // Patient Register Form State
    const [regName, setRegName] = useState('');
    const [regLoginId, setRegLoginId] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const from = (location.state as any)?.from?.pathname || '/';

    const redirectForRole = (role: string) => {
        if (role === 'PATIENT') return '/patient/dashboard';
        if (role === 'DOCTOR') return '/doctor/dashboard';
        if (role === 'ADMIN') return '/admin/dashboard';
        return '/';
    };

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

            if (from && from !== '/' && from !== '/login') {
                navigate(from, { replace: true });
            } else {
                navigate(redirectForRole(user.role), { replace: true });
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!regName.trim() || !regLoginId.trim() || !regPassword.trim()) {
            setErrorMsg('Full Name, Login ID, and Password are required for registration.');
            return;
        }

        if (regPassword.trim().length < 6) {
            setErrorMsg('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);

        try {
            const data = await registerPatient({
                name: regName.trim(),
                loginId: regLoginId.trim(),
                password: regPassword.trim(),
                email: regEmail.trim() || undefined,
                phone: regPhone.trim() || undefined
            });

            login(data.token, data.user);
            toast.success(`Account created! Welcome, ${data.user.name}!`);
            navigate('/patient/dashboard', { replace: true });

        } catch (err: any) {
            const msg = err.response?.data?.error || 'Registration failed. Please check your input.';
            setErrorMsg(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const prefillCredentials = (id: string, pass: string) => {
        setMode('login');
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

            {/* Main Auth Card */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200">
                {/* Mode Selector Tabs */}
                {!currentUser && (
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setErrorMsg(null); }}
                            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'login'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <User className="w-3.5 h-3.5" /> Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('register'); setErrorMsg(null); }}
                            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'register'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Register Patient
                        </button>
                    </div>
                )}

                {currentUser ? (
                    <div className="space-y-4 text-center py-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Currently Signed In</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{currentUser.name || currentUser.loginId}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Role: <span className="font-semibold text-blue-700">{currentUser.role}</span></p>
                        </div>
                        <Button className="w-full" onClick={() => navigate(redirectForRole(currentUser.role))}>
                            Go to {currentUser.role} Dashboard
                        </Button>
                    </div>
                ) : mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-5">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                            <User className="w-4 h-4 text-blue-600" /> Account Sign In
                        </h2>

                        {errorMsg && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2.5">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <Input
                            label="Login Identifier (Patient Code / Doctor Code / Admin)"
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
                            placeholder="Enter account password"
                        />

                        <Button type="submit" className="w-full justify-center py-2.5" isLoading={loading}>
                            <Lock className="w-4 h-4 mr-2" />
                            Sign In to Account
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                            <UserPlus className="w-4 h-4 text-blue-600" /> Create Patient Account
                        </h2>

                        {errorMsg && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2.5">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <Input
                            label="Full Patient Name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="e.g. Patient 3"
                            required
                            autoFocus
                        />

                        <Input
                            label="Choose Login ID / Username"
                            value={regLoginId}
                            onChange={(e) => setRegLoginId(e.target.value)}
                            placeholder="e.g. patient3 or P-000003"
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            required
                        />

                        <Input
                            label="Email Address (.test domain for dev)"
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="e.g. patient3@example.test"
                        />

                        <Input
                            label="Phone Number"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="e.g. 555-0103"
                        />

                        <Button type="submit" className="w-full justify-center py-2.5 bg-emerald-600 hover:bg-emerald-700 border-transparent text-white mt-2" isLoading={loading}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Register & Sign In
                        </Button>
                    </form>
                )}

                {/* Development Account Quick Prefills */}
                <div className="mt-8 pt-5 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Fictional Test Accounts (Click to Prefill):
                    </p>
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => prefillCredentials('P-000001', 'patient123')}
                            className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs text-gray-700"
                        >
                            <span className="flex items-center gap-1.5 font-medium">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Patient 1: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-900">P-000001</code>
                            </span>
                            <span className="text-gray-400 font-mono text-[11px]">patient123</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => prefillCredentials('D-000001', 'doctor123')}
                            className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs text-gray-700"
                        >
                            <span className="flex items-center gap-1.5 font-medium">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-600" /> Doctor 1: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-900">D-000001</code>
                            </span>
                            <span className="text-gray-400 font-mono text-[11px]">doctor123</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => prefillCredentials('admin', 'admin123')}
                            className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between text-xs text-gray-700"
                        >
                            <span className="flex items-center gap-1.5 font-medium">
                                <ShieldAlert className="w-3.5 h-3.5 text-blue-600" /> Admin 1: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-900">admin</code>
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
