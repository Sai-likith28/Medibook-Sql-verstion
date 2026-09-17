import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BookingLookupModal from '../components/BookingLookupModal';
import {
    Shield,
    BarChart3,
    Calendar,
    UserPlus,
    PlusCircle,
    LogOut,
    Search,
    ChevronRight,
    Menu,
    X,
    Server
} from 'lucide-react';
import clsx from 'clsx';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isLookupOpen, setIsLookupOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/admin/dashboard', label: 'Overview & Slots', icon: Calendar },
        { path: '/admin/reports', label: 'SQL Analytics (6 Reports)', icon: BarChart3 },
        { path: '/admin/create-doctor', label: 'Add New Doctor', icon: UserPlus },
        { path: '/admin/create-slot', label: 'Create Slot', icon: PlusCircle },
    ];

    const adminDisplayName = user?.name || user?.loginId || 'Admin';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Top Admin Header */}
            <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-purple-600 rounded-md text-white shadow-sm">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-lg text-white tracking-tight">
                                    MediBook <span className="text-xs text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800 font-semibold">Admin Console</span>
                                </span>
                            </Link>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsLookupOpen(true)}
                                className="hidden sm:inline-flex items-center px-3 py-1.5 border border-slate-700 text-xs font-semibold rounded-md text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                                <Search className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                Find Booking
                            </button>

                            {/* Admin Badge */}
                            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                                <div className="p-1.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 hidden sm:block">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div className="text-left leading-tight">
                                    <div className="text-xs font-bold text-white">{adminDisplayName}</div>
                                    <div className="text-[10px] text-purple-400 font-mono font-medium">System Administrator</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="ml-2 p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area: Sidebar + Body */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
                {/* Admin Sidebar */}
                <aside className={clsx(
                    "w-full md:w-64 flex-shrink-0 space-y-4",
                    mobileMenuOpen ? "block" : "hidden md:block"
                )}>
                    {/* Admin Status Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                A
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{adminDisplayName}</h3>
                                <p className="text-xs text-purple-600 font-mono font-semibold">Super Admin</p>
                            </div>
                        </div>
                        <div className="pt-3 text-[11px] text-slate-500 space-y-1">
                            <div className="flex justify-between">
                                <span>Engine:</span>
                                <span className="text-slate-700 font-medium">MySQL InnoDB</span>
                            </div>
                            <div className="flex justify-between">
                                <span>SQL Reports:</span>
                                <span className="text-emerald-600 font-semibold">6 Analytical Queries</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="bg-white rounded-xl border border-gray-200 shadow-sm p-2 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={clsx(
                                        "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors",
                                        active
                                            ? "bg-purple-50 text-purple-800 border border-purple-200"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className={clsx("w-4 h-4", active ? "text-purple-600" : "text-slate-400")} />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronRight className={clsx("w-3.5 h-3.5", active ? "text-purple-500" : "text-slate-300")} />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* System Info Box */}
                    <div className="bg-slate-900 rounded-xl p-4 text-slate-300 shadow-sm space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase tracking-wider text-[11px]">
                            <Server className="w-3.5 h-3.5" /> Database Security
                        </div>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
                            Row-level locking (`SELECT ... FOR UPDATE`), atomic stored procedures, and audit triggers active.
                        </p>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0">
                    <Outlet />
                </main>
            </div>

            <BookingLookupModal
                isOpen={isLookupOpen}
                onClose={() => setIsLookupOpen(false)}
            />
        </div>
    );
};

export default AdminLayout;
