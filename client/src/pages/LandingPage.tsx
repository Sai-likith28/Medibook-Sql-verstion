import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Stethoscope,
    ShieldCheck,
    Lock,
    ArrowRight,
    Database,
    FileCheck,
    UserCheck,
    BarChart3,
    CheckCircle2,
    Activity
} from 'lucide-react';

const LandingPage = () => {
    const { user } = useAuth();

    const getPortalPath = () => {
        if (!user) return '/login';
        if (user.role === 'ADMIN') return '/admin/dashboard';
        if (user.role === 'DOCTOR') return '/doctor/dashboard';
        return '/patient/dashboard';
    };

    return (
        <div className="space-y-16 py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* HERO SECTION */}
            <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/80 via-white to-gray-50 rounded-2xl border border-blue-100 p-8 sm:p-12 shadow-sm">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-semibold">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        MediBook 2.0 Healthcare Platform
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Healthcare Management Platform <br className="hidden sm:inline" />
                        <span className="text-blue-600">Connecting Patients, Doctors & Admin</span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                        A robust, role-protected healthcare platform providing database-backed appointment scheduling, clinical test tracking, and analytical reporting across clinical portals.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                        {user ? (
                            <Link
                                to={getPortalPath()}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm gap-2"
                            >
                                <UserCheck className="w-4 h-4" />
                                Go to {user.role} Portal
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                Sign In to Portal
                            </Link>
                        )}

                        <a
                            href="#about-us"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-bold rounded-lg text-slate-700 bg-white hover:bg-gray-50 transition-colors shadow-sm gap-2"
                        >
                            Learn More
                        </a>
                    </div>

                    {/* Development Demo Login Callout */}
                    <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 border-t border-blue-100/60 mt-6">
                        <span className="font-semibold text-slate-700">Dev Demo Accounts:</span>
                        <span>Patient: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-slate-900 font-bold">P-000001</code> / <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-slate-900">patient123</code></span>
                        <span>Doctor: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-slate-900 font-bold">D-000001</code> / <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-slate-900">doctor123</code></span>
                        <span>Admin: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-slate-900 font-bold">admin</code> / <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-slate-900">admin123</code></span>
                    </div>
                </div>
            </section>

            {/* ABOUT US SECTION */}
            <section id="about-us" className="space-y-6 scroll-mt-20">
                <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm space-y-6">
                    <div className="space-y-2 max-w-3xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                            About MediBook 2.0
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Unified Healthcare Management Platform
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                            MediBook 2.0 connects patients, medical specialists, and administration through a single, secure web platform. Engineered with MySQL InnoDB relational integrity, the platform ensures double-booking prevention, role-based security, clinical test tracking, and operational analytical reporting.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-blue-600" /> Authenticated Patient Identity
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Patients access their dedicated portal to schedule appointments, view consultation histories, and track suggested clinical tests under verified identity bindings.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Doctor Clinical Workspace
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Attending specialists view assigned consultation schedules, inspect patient records, and order clinical tests directly from their workspace desk.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-purple-600" /> Administrative SQL Reporting
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Hospital administration oversees slot availability, doctor creation, and executes 6 real-time SQL analytical queries for operational insights.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS SECTION */}
            <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-sm space-y-8">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">How It Works</h2>
                    <p className="text-xs sm:text-sm text-slate-400">Streamlined clinical workflows tailored for each portal role.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Patient Step */}
                    <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                                Patient Role
                            </span>
                            <UserCheck className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-base font-bold text-white">Patient Workflow</h3>
                        <ul className="space-y-2 text-xs text-slate-300">
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                                Sign in to Patient Portal
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                                Book appointment with doctor
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                                View suggested tests & receipts
                            </li>
                        </ul>
                    </div>

                    {/* Doctor Step */}
                    <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                                Doctor Role
                            </span>
                            <Stethoscope className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="text-base font-bold text-white">Doctor Workflow</h3>
                        <ul className="space-y-2 text-xs text-slate-300">
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                                Sign in to Clinical Workspace
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                                View assigned appointments
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                                Manage clinical test suggestions
                            </li>
                        </ul>
                    </div>

                    {/* Admin Step */}
                    <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                                Admin Role
                            </span>
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-base font-bold text-white">Admin Workflow</h3>
                        <ul className="space-y-2 text-xs text-slate-300">
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                                Sign in to Admin Console
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                                Manage doctors & appointment slots
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                                Run 6 SQL analytical reports
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* TRUST / FEATURES SECTION */}
            <section className="space-y-6">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Platform Features & Architecture</h2>
                    <p className="text-xs text-slate-500">Core capabilities implemented and verified in MediBook 2.0.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Secure Auth & RBAC</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Bcrypt password hashing and JWT authentication enforcing access control for Patient, Doctor, and Admin.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                            <Database className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Transactional Scheduling</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Atomic booking execution using <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">SELECT ... FOR UPDATE</code> row-level locking to prevent double-bookings.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                            <FileCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Clinical Test Suggestions</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Doctors order clinical tests from an active catalog with duplicate prevention and clinical result deletion safety.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">SQL Analytics Reports</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            6 real-time SQL queries computing doctor utilization, peak booking times, specialization demand, and audit lifecycles.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
