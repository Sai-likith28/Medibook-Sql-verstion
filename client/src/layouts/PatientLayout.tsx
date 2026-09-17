import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BookingLookupModal from '../components/BookingLookupModal';
import {
    LayoutDashboard,
    Calendar,
    FileText,
    Pill,
    Search,
    LogOut,
    User as UserIcon,
    Stethoscope,
    ChevronRight,
    Menu,
    X,
    PlusCircle
} from 'lucide-react';
import clsx from 'clsx';

const PatientLayout = () => {
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
        { path: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/patient/book-appointment', label: 'Book Appointment', icon: PlusCircle },
        { path: '/patient/appointments', label: 'My Appointments', icon: Calendar },
        { path: '/patient/tests', label: 'Clinical Tests', icon: FileText },
        { path: '/patient/prescriptions', label: 'Prescriptions', icon: Pill },
    ];

    const patientDisplayName = user?.name || 'Patient User';
    const patientCode = user?.patientCode || user?.loginId || 'P-000001';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Top Patient Bar */}
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
                            <Link to="/patient/dashboard" className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-600 rounded-md text-white">
                                    <Stethoscope className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-lg text-slate-900 tracking-tight">
                                    MediBook <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">Patient Portal</span>
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
                                Find Booking by Code
                            </button>

                            {/* Patient Badge */}
                            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                                <div className="p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hidden sm:block">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <div className="text-left leading-tight">
                                    <div className="text-xs font-bold text-slate-900">{patientDisplayName}</div>
                                    <div className="text-[10px] text-blue-600 font-mono font-medium">ID: {patientCode}</div>
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
                    {/* Patient Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                {patientDisplayName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{patientDisplayName}</h3>
                                <p className="text-xs text-slate-500 font-mono">Patient Code: {patientCode}</p>
                            </div>
                        </div>
                        <div className="pt-3 text-[11px] text-slate-500 space-y-1">
                            <div className="flex justify-between">
                                <span>Account Status:</span>
                                <span className="text-emerald-600 font-semibold uppercase">{user?.status || 'ACTIVE'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Auth Level:</span>
                                <span className="text-slate-700 font-medium">Verified Patient</span>
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
                                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className={clsx("w-4 h-4", active ? "text-blue-600" : "text-slate-400")} />
                                        <span>{item.label}</span>
                                    </div>
                                    <ChevronRight className={clsx("w-3.5 h-3.5", active ? "text-blue-500" : "text-slate-300")} />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Dedicated Patient Booking Shortcut */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-100">Need an Appointment?</h4>
                        <p className="text-xs text-blue-100 leading-relaxed">
                            Search our specialist directory and schedule a consultation slot directly.
                        </p>
                        <Link
                            to="/patient/book-appointment"
                            className="inline-block mt-1 w-full text-center py-2 px-3 bg-white text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                        >
                            Book New Appointment
                        </Link>
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

export default PatientLayout;
