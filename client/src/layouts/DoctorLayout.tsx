import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BookingLookupModal from '../components/BookingLookupModal';
import {
    Calendar,
    Users,
    Stethoscope,
    LogOut,
    Search,
    ChevronRight,
    Menu,
    X,
    Activity,
    ClipboardList
} from 'lucide-react';
import clsx from 'clsx';

const DoctorLayout = () => {
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
        { path: '/doctor/dashboard', label: "Today's Schedule", icon: Calendar },
        { path: '/doctor/appointments', label: 'Consultations', icon: ClipboardList },
        { path: '/doctor/patients', label: 'Patient Directory', icon: Users },
    ];

    const doctorDisplayName = user?.name || 'Doctor';
    const doctorCode = user?.doctorCode || user?.loginId || 'D-000001';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Top Doctor Bar */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                            <Link to="/doctor/dashboard" className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-600 rounded-md text-white">
                                    <Stethoscope className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-lg text-slate-900 tracking-tight">
                                    MediBook <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">Clinical Portal</span>
                                </span>
                            </Link>
                        </div>

                        {/* Right Top Header Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsLookupOpen(true)}
                                className="hidden sm:inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <Search className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                                Find Booking by Reference
                            </button>

                            {/* Doctor Badge */}
                            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                                <div className="p-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:block">
                                    <Stethoscope className="w-4 h-4" />
                                </div>
                                <div className="text-left leading-tight">
                                    <div className="text-xs font-bold text-slate-900">{doctorDisplayName}</div>
                                    <div className="text-[10px] text-emerald-700 font-mono font-medium">Doctor Code: {doctorCode}</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="ml-2 p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Area: Sidebar + Content */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
                {/* Desktop Sidebar */}
                <aside className={clsx(
                    "w-full md:w-64 flex-shrink-0 space-y-4",
                    mobileMenuOpen ? "block" : "hidden md:block"
                )}>
                    {/* Doctor Info Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                {doctorDisplayName.replace('Dr. ', '').charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{doctorDisplayName}</h3>
                                <p className="text-xs text-slate-500 font-mono">Code: {doctorCode}</p>
                            </div>
                        </div>
                        <div className="pt-3 text-[11px] text-slate-500 space-y-1">
                            <div className="flex justify-between">
                                <span>Clinical Status:</span>
                                <span className="text-emerald-600 font-semibold uppercase">ACTIVE PROVIDER</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Role Access:</span>
                                <span className="text-slate-700 font-medium">Doctor Portal</span>
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
                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className={clsx("w-4 h-4", active ? "text-emerald-600" : "text-slate-400")} />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronRight className={clsx("w-3.5 h-3.5", active ? "text-emerald-500" : "text-slate-300")} />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Clinical Workflow Notice */}
                    <div className="bg-slate-900 rounded-xl p-4 text-slate-300 shadow-sm space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                            <Activity className="w-3.5 h-3.5" /> Clinical Desk
                        </div>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
                            Manage appointments, review patient cases, and prepare for incoming clinical consultation actions.
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

export default DoctorLayout;
