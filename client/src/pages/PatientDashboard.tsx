import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { getMyAppointments, getPatientTests } from '../services/api';
import type { PatientAppointment, AppointmentTestItem } from '../services/api';
import Spinner from '../components/Spinner';
import {
    Calendar,
    FileText,
    Pill,
    Clock,
    PlusCircle,
    User,
    ChevronRight,
    Stethoscope,
    CheckCircle2
} from 'lucide-react';
import { formatAppointmentDate, formatAppointmentTime, getStatusBadgeStyle } from '../utils/formatters';

const PatientDashboard = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
    const [tests, setTests] = useState<AppointmentTestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'appointments' | 'tests' | 'prescriptions'>('appointments');

    const patientDisplayName = user?.name || 'Patient User';
    const patientCode = user?.patientCode || user?.loginId || 'P-000001';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [apptData, testData] = await Promise.all([
                    getMyAppointments(),
                    getPatientTests().catch(() => [])
                ]);
                setAppointments(apptData);
                setTests(testData);
            } catch (error: any) {
                console.error('Failed to load patient dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/40 text-blue-100 text-xs font-medium border border-blue-400/30">
                        <User className="w-3.5 h-3.5" /> Authenticated Patient Account
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Welcome, {patientDisplayName}
                    </h1>
                    <p className="text-xs sm:text-sm text-blue-100">
                        Patient Code: <span className="font-mono font-bold text-white">{patientCode}</span> • Portal Access Active
                    </p>
                </div>

                <Link
                    to="/patient/book-appointment"
                    className="inline-flex items-center px-4 py-2.5 bg-white text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-50 transition-colors shadow-sm gap-2"
                >
                    <PlusCircle className="w-4 h-4" />
                    Book New Appointment
                </Link>
            </div>

            {/* Overview Metric Cards (Real Metrics) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Upcoming Appointments</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{confirmedCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Active scheduled visits</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Suggested Clinical Tests</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{tests.length}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Pending & ordered test suggestions</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Digital Prescriptions</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">0</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Prescribed medications</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                        <Pill className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Tabs Area */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Tab Controls */}
                <div className="border-b border-gray-200 px-6 pt-4 bg-slate-50/50">
                    <nav className="flex space-x-6">
                        <button
                            onClick={() => setActiveTab('appointments')}
                            className={`pb-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                                activeTab === 'appointments'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Calendar className="w-4 h-4" />
                            My Appointments ({appointments.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('tests')}
                            className={`pb-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                                activeTab === 'tests'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            Clinical Tests ({tests.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('prescriptions')}
                            className={`pb-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                                activeTab === 'prescriptions'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Pill className="w-4 h-4" />
                            Prescriptions
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'appointments' && (
                        loading ? (
                            <div className="flex justify-center p-8"><Spinner /></div>
                        ) : appointments.length === 0 ? (
                            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
                                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-slate-900">No upcoming appointments</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        You have no active appointment bookings associated with patient identity <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{patientCode}</code>.
                                    </p>
                                </div>
                                <Link
                                    to="/patient/book-appointment"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-sm gap-1.5"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Book New Appointment
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                                    <span>Showing {appointments.length} appointment records</span>
                                </div>
                                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                                    {appointments.map((appt) => {
                                        const statusStyle = getStatusBadgeStyle(appt.status);
                                        return (
                                            <div
                                                key={appt._id}
                                                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0">
                                                        <Stethoscope className="w-5 h-5" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                {appt.bookingRef}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusStyle.badgeClass}`}>
                                                                {statusStyle.label}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-sm font-bold text-slate-900">{appt.doctorName}</h4>
                                                        <p className="text-xs text-slate-500">{appt.specialization}</p>
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
                                                        to={`/patient/appointments/${appt.id}`}
                                                        className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors gap-1 shadow-sm"
                                                    >
                                                        Details
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    )}

                    {activeTab === 'tests' && (
                        loading ? (
                            <div className="flex justify-center p-8"><Spinner /></div>
                        ) : tests.length === 0 ? (
                            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
                                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-slate-900">No suggested clinical tests</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Clinical tests ordered by your attending doctors will appear in this section.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                                    <span>Showing {tests.length} suggested test records</span>
                                </div>
                                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                                    {tests.map(t => (
                                        <div key={t.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {t.testCode}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                                                    <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                                                        {t.category}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Ordered by <span className="font-semibold text-slate-700">{t.doctorName}</span> {t.slotDate ? `for visit on ${formatAppointmentDate(t.slotDate)}` : ''}
                                                </p>
                                                {t.instructions && (
                                                    <p className="text-xs text-slate-600 italic">
                                                        Instructions: "{t.instructions}"
                                                    </p>
                                                )}
                                                {t.result ? (
                                                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Result: {t.result.value}
                                                        </div>
                                                        {t.result.notes && (
                                                            <p className="text-[11px] text-emerald-700">Notes: {t.result.notes}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                                                        <Clock className="w-3 h-3" /> Status: {t.status || 'SUGGESTED'} (Awaiting result entry)
                                                    </p>
                                                )}
                                            </div>

                                            <Link
                                                to={`/patient/appointments/${t.bookingId}`}
                                                className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors gap-1 shadow-sm self-start sm:self-center"
                                            >
                                                View Appointment
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}

                    {activeTab === 'prescriptions' && (
                        <div className="text-center py-10 space-y-4 max-w-md mx-auto">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
                                <Pill className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-slate-900">Prescription history will appear here</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Digital prescriptions issued during completed consultations will be securely linked to your patient profile.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
