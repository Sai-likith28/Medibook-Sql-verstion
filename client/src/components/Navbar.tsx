import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import clsx from 'clsx';

const Navbar = () => {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                            <Stethoscope className="h-8 w-8 text-blue-600" />
                            <span className="text-xl font-bold text-gray-900">MediBook</span>
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
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
