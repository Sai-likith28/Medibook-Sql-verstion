import { useEffect, useState } from 'react';
import { getAllSlots, getDoctors } from '../services/api';
import type { Slot, Doctor } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import AdminReports from './AdminReports';
import { Link } from 'react-router-dom';
import { Plus, Users, Calendar, BarChart3, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [viewMode, setViewMode] = useState<'slots' | 'analytics'>('slots');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [slotsData, doctorsData] = await Promise.all([
                    getAllSlots(),
                    getDoctors()
                ]);
                setSlots(slotsData);
                setDoctors(doctorsData);
            } catch (error) {
                toast.error('Failed to load admin dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getDoctorName = (id: string) => {
        return doctors.find(d => d._id === id)?.name || 'Unknown Doctor';
    };

    if (loading) return <div className="flex justify-center p-12"><Spinner size={48} className="text-purple-600" /></div>;

    const bookedSlotsCount = slots.filter(s => s.isBooked).length;
    const availableSlotsCount = slots.length - bookedSlotsCount;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-purple-950 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-purple-900/40">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-900/60 text-purple-200 text-xs font-medium border border-purple-700/50">
                        <Shield className="w-3.5 h-3.5" /> System Operations Console
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Admin Control Dashboard
                    </h1>
                    <p className="text-xs sm:text-sm text-purple-200">
                        MySQL Database Operations • Appointment Management • SQL Analytical Reporting
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/admin/create-doctor">
                        <Button variant="secondary" className="text-xs bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
                            <Users className="mr-1.5 h-3.5 w-3.5" />
                            Add Doctor
                        </Button>
                    </Link>
                    <Link to="/admin/create-slot">
                        <Button className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-transparent">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Create Slot
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Active Doctors</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{doctors.length}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Registered providers</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600 border border-purple-100">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Total Appointment Slots</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{slots.length}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Booked: {bookedSlotsCount} • Available: {availableSlotsCount}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">SQL Analytical Reports</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">6</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Read-only analytical queries</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* View Mode Toggle Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 px-6 pt-4 bg-slate-50/50">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setViewMode('slots')}
                            className={`flex items-center pb-4 px-1 border-b-2 font-bold text-xs transition-colors ${
                                viewMode === 'slots'
                                    ? 'border-purple-600 text-purple-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            Appointments & Slots Table
                        </button>
                        <button
                            onClick={() => setViewMode('analytics')}
                            className={`flex items-center pb-4 px-1 border-b-2 font-bold text-xs transition-colors ${
                                viewMode === 'analytics'
                                    ? 'border-purple-600 text-purple-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            SQL Analytics & Reports (6 Retained Reports)
                        </button>
                    </nav>
                </div>

                {/* View Mode 1: Appointments & Slots Table */}
                {viewMode === 'slots' && (
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-600" /> System Slots Overview
                            </h3>
                            <span className="text-xs text-slate-500">Showing {slots.length} total slots</span>
                        </div>

                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Doctor Name
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Slot Date
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Slot Time
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Booking Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-xs">
                                    {slots.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                                No appointment slots created in system yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        slots.map((slot) => (
                                            <tr key={slot._id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-900">
                                                    {getDoctorName(slot.doctorId)}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                                                    {new Date(slot.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 font-mono">
                                                    {slot.time}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    {slot.isBooked ? (
                                                        <span className="px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                                            Booked
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Available
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* View Mode 2: Integrated SQL Analytics Component */}
                {viewMode === 'analytics' && (
                    <div className="p-6">
                        <AdminReports />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
