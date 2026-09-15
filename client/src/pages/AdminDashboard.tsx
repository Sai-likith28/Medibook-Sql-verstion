import { useEffect, useState } from 'react';
import { getAllSlots, getDoctors } from '../services/api';
import type { Slot, Doctor } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import AdminReports from './AdminReports';
import { Link } from 'react-router-dom';
import { Plus, Users, Calendar, BarChart3 } from 'lucide-react';
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
                    getAllSlots(), // Fetches all slots
                    getDoctors()
                ]);
                setSlots(slotsData);
                setDoctors(doctorsData);
            } catch (error) {
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getDoctorName = (id: string) => {
        return doctors.find(d => d._id === id)?.name || 'Unknown Doctor';
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

    return (
        <div className="space-y-6">
            {/* Top View Toggle Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setViewMode('slots')}
                        className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            viewMode === 'slots'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Calendar className="mr-2 h-5 w-5" />
                        Appointments & Slots
                    </button>
                    <button
                        onClick={() => setViewMode('analytics')}
                        className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            viewMode === 'analytics'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <BarChart3 className="mr-2 h-5 w-5" />
                        SQL Analytics & Reports
                    </button>
                </nav>
            </div>

            {/* View Mode 1: Original Appointments & Slots Management */}
            {viewMode === 'slots' && (
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar / Actions Area */}
                    <div className="w-full md:w-64 flex-shrink-0 space-y-4">
                        <div className="bg-white p-4 shadow rounded-lg border border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <Link to="/admin/create-doctor" className="block">
                                    <Button className="w-full justify-start" variant="secondary">
                                        <Users className="mr-2 h-4 w-4" />
                                        Add New Doctor
                                    </Button>
                                </Link>
                                <Link to="/admin/create-slot" className="block">
                                    <Button className="w-full justify-start">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Slot
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="bg-white p-4 shadow rounded-lg border border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900 mb-2">Stats</h2>
                            <div className="text-sm text-gray-500">
                                <p>Total Doctors: <span className="font-medium text-gray-900">{doctors.length}</span></p>
                                <p className="mt-1">Total Slots: <span className="font-medium text-gray-900">{slots.length}</span></p>
                                <p className="mt-1 text-red-600">Booked: <span className="font-medium text-red-600">{slots.filter(s => s.isBooked).length}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area - Slot Table */}
                    <div className="flex-1 bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                <Calendar className="inline-block mr-2 h-5 w-5 text-gray-400" />
                                All Appointments / Slots
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Doctor
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Time
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {slots.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No slots found</td>
                                        </tr>
                                    ) : (
                                        slots.map((slot) => (
                                            <tr key={slot._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {getDoctorName(slot.doctorId)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(slot.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {slot.time}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {slot.isBooked ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                            Booked
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
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
                </div>
            )}

            {/* View Mode 2: SQL Analytics Dashboard Component */}
            {viewMode === 'analytics' && (
                <AdminReports />
            )}
        </div>
    );
};

export default AdminDashboard;
