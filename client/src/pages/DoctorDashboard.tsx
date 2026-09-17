import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { getDoctorAppointments } from '../services/api';
import type { DoctorAppointment } from '../services/api';
import Spinner from '../components/Spinner';
import {
    Calendar,
    Users,
    Stethoscope,
    Clock,
    Activity,
    ClipboardList,
    User,
    ChevronRight
} from 'lucide-react';
import { formatAppointmentDate, formatAppointmentTime, getStatusBadgeStyle } from '../utils/formatters';

const DoctorDashboard = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'today' | 'all'>('today');

    const doctorDisplayName = user?.name || 'Doctor Provider';
    const doctorCode = user?.doctorCode || user?.loginId || 'D-000001';

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const data = await getDoctorAppointments();
                setAppointments(data);
            } catch (error: any) {
                console.error('Failed to load doctor appointments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date && a.date.startsWith(todayStr));
    const displayedAppointments = filter === 'today' ? todayAppointments : appointments;

    return (
        <div className="space-y-6">
            {/* Doctor Welcome Banner */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600/40 text-emerald-100 text-xs font-medium border border-emerald-500/30">
                        <Stethoscope className="w-3.5 h-3.5" /> Authenticated Clinical Provider
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Welcome, {doctorDisplayName}
                    </h1>
                    <p className="text-xs sm:text-sm text-emerald-100">
                        Doctor Code: <span className="font-mono font-bold text-white">{doctorCode}</span> • Clinical Portal Active
                    </p>
                </div>

                <div className="px-4 py-2 bg-emerald-900/60 rounded-xl border border-emerald-600/40 text-xs space-y-0.5">
                    <p className="text-emerald-200 font-semibold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Schedule Status
                    </p>
                    <p className="text-white font-bold">Accepting Appointments</p>
                </div>
            </div>

            {/* Overview Metric Cards (Real Metrics) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Today's Appointments</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{todayAppointments.length}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Scheduled for today</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Total Consultations</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{appointments.length}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Active consultation cases</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Pending Actions</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">0</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Tests & prescriptions</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600 border border-purple-100">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Schedule & Consultation Area */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header Controls */}
                <div className="px-6 py-4 border-b border-gray-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-sm font-bold text-slate-900">Clinical Consultation Schedule</h2>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <button
                            onClick={() => setFilter('today')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                                filter === 'today'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
                            }`}
                        >
                            Today ({todayAppointments.length})
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                                filter === 'all'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-gray-200'
                            }`}
                        >
                            All ({appointments.length})
                        </button>
                    </div>
                </div>

                {/* Consultation List */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center p-8"><Spinner size={48} className="text-emerald-600" /></div>
                    ) : displayedAppointments.length === 0 ? (
                        <div className="p-12 text-center space-y-4 max-w-md mx-auto">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-900">No appointments scheduled for {filter}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    No patient consultations currently assigned to doctor code <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{doctorCode}</code>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                                <span>Showing {displayedAppointments.length} assigned patient consultations</span>
                            </div>

                            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                                {displayedAppointments.map((appt) => {
                                    const statusStyle = getStatusBadgeStyle(appt.status);
                                    return (
                                        <div
                                            key={appt._id}
                                            className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex-shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            {appt.bookingRef}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusStyle.badgeClass}`}>
                                                            {statusStyle.label}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-900">{appt.patientName}</h4>
                                                    <p className="text-xs text-slate-500 font-mono">
                                                        Patient Code: <span className="font-semibold text-slate-700">{appt.patientCode || `P-${String(appt.patientId).padStart(6, '0')}`}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                                                <div className="text-left sm:text-right space-y-0.5 text-xs">
                                                    <p className="font-bold text-slate-900 flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {formatAppointmentDate(appt.date)}
                                                    </p>
                                                    <p className="text-slate-500 font-mono flex items-center gap-1 sm:justify-end">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        {formatAppointmentTime(appt.time)}
                                                    </p>
                                                </div>

                                                <Link
                                                    to={`/doctor/appointments/${appt.id}`}
                                                    className="inline-flex items-center px-3 py-1.5 border border-emerald-200 text-xs font-semibold rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors gap-1 shadow-sm"
                                                >
                                                    Consultation
                                                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
