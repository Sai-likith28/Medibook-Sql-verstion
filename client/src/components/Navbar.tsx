import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, Search, LogIn, LogOut, User as UserIcon, Shield } from 'lucide-react';
import clsx from 'clsx';
import BookingLookupModal from './BookingLookupModal';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [isLookupOpen, setIsLookupOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            <nav className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                                <Stethoscope className="h-8 w-8 text-blue-600" />
                                <span className="text-xl font-bold text-gray-900 tracking-tight">MediBook <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">2.0</span></span>
                            </Link>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    to="/"
                                    className={clsx(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                                        isActive('/')
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    )}
                                >
                                    Find Doctors
                                </Link>
                                <Link
                                    to="/admin"
                                    className={clsx(
                                        "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                                        isActive('/admin') || location.pathname.startsWith('/admin')
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                    )}
                                >
                                    Admin Dashboard
                                </Link>
                            </div>
                        </div>

                        {/* Right Header Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsLookupOpen(true)}
                                className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-semibold rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                <Search className="w-3.5 h-3.5 mr-1.5" />
                                Find My Booking
                            </button>

                            {user ? (
                                <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-1">
                                    <div className="text-right hidden md:block">
                                        <div className="text-xs font-bold text-gray-900 flex items-center justify-end gap-1">
                                            {user.role === 'ADMIN' ? <Shield className="w-3 h-3 text-purple-600" /> : <UserIcon className="w-3 h-3 text-blue-600" />}
                                            {user.name || user.loginId}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-medium">
                                            Role: <span className="text-blue-600 font-semibold">{user.role}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                        title="Sign Out"
                                    >
                                        <LogOut className="w-3.5 h-3.5 mr-1 text-gray-500" />
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <BookingLookupModal
                isOpen={isLookupOpen}
                onClose={() => setIsLookupOpen(false)}
            />
        </>
    );
};

export default Navbar;
