import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Stethoscope, Search, LogIn, Shield, Calendar, Heart, Award } from 'lucide-react';
import BookingLookupModal from '../components/BookingLookupModal';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const PublicLayout = () => {
    const location = useLocation();
    const { user } = useAuth();
    const [isLookupOpen, setIsLookupOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const getRoleDashboardPath = () => {
        if (!user) return '/login';
        if (user.role === 'ADMIN') return '/admin/dashboard';
        if (user.role === 'DOCTOR') return '/doctor/dashboard';
        return '/patient/dashboard';
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
            {/* Top Healthcare Announcement Bar */}
            <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-medium text-slate-200">MediBook 2.0 Platform Active</span>
                    <span className="hidden md:inline text-slate-400">| Database-Backed Appointment Scheduling</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-slate-400">Role Access: Patient, Doctor & Admin</span>
                </div>
            </div>

            {/* Main Navbar */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex-shrink-0 flex items-center gap-2.5">
                                <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
                                    <Stethoscope className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                                        MediBook <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">2.0</span>
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Healthcare Platform</span>
                                </div>
                            </Link>
                            <nav className="hidden md:ml-8 md:flex md:space-x-6">
                                <Link
                                    to="/"
                                    className={clsx(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors",
                                        isActive('/')
                                            ? "border-blue-600 text-blue-600 font-semibold"
                                            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                                    )}
                                >
                                    Home
                                </Link>
                                <a
                                    href="#about-us"
                                    className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
                                >
                                    About Us
                                </a>
                            </nav>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsLookupOpen(true)}
                                className="inline-flex items-center px-3.5 py-1.5 border border-blue-600 text-xs font-semibold rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                            >
                                <Search className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                Find My Booking
                            </button>

                            {user ? (
                                <Link
                                    to={getRoleDashboardPath()}
                                    className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm gap-1.5"
                                >
                                    <Shield className="w-3.5 h-3.5" />
                                    {user.role} Portal
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Platform Footer */}
            <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-sm py-12 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        {/* Column 1: Brand & Purpose */}
                        <div className="space-y-3 md:col-span-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-600 rounded text-white">
                                    <Stethoscope className="h-5 w-5" />
                                </div>
                                <span className="text-lg font-bold text-white tracking-tight">MediBook 2.0</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Next-generation healthcare management platform designed with MySQL relational transactions, role-based authorization, and real-time appointment scheduling.
                            </p>
                        </div>

                        {/* Column 2: System Architecture */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Capabilities</h4>
                            <ul className="space-y-2 text-xs">
                                <li className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-blue-400" /> Secure Role-Based Access Control
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Double-Booking Prevention
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <Heart className="w-3.5 h-3.5 text-rose-400" /> Patient Record Management
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-amber-400" /> SQL Analytical Reporting
                                </li>
                            </ul>
                        </div>

                        {/* Column 3: Portal Quick Links */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Portal Quick Links</h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <Link to="/login" className="hover:text-white transition-colors">Patient Portal Login (P-000001)</Link>
                                </li>
                                <li>
                                    <Link to="/login" className="hover:text-white transition-colors">Doctor Portal Login (D-000001)</Link>
                                </li>
                                <li>
                                    <Link to="/login" className="hover:text-white transition-colors">Admin Console (admin)</Link>
                                </li>
                            </ul>
                        </div>

                        {/* Column 4: System Notice */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Platform Status</h4>
                            <div className="p-3 rounded bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
                                <p className="text-slate-300 font-medium">Database-Backed Platform</p>
                                <p className="text-[11px] text-slate-400">MySQL InnoDB Engine • Row-level Locking • Stored Procedures</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
                        <p>© {new Date().getFullYear()} MediBook Healthcare Management Platform. All rights reserved.</p>
                        <p className="mt-2 sm:mt-0 text-[11px]">Designed for secure clinical workflows & analytical reporting.</p>
                    </div>
                </div>
            </footer>

            {/* Booking Lookup Modal */}
            <BookingLookupModal
                isOpen={isLookupOpen}
                onClose={() => setIsLookupOpen(false)}
            />
        </div>
    );
};

export default PublicLayout;
