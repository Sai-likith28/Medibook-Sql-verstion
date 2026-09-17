import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    getMyAppointmentById, 
    getDoctorAppointmentById,
    getTestCatalog,
    suggestTest,
    removeTest
} from '../services/api';
import type { PatientAppointment, TestCatalogItem, AppointmentTestItem } from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import {
    Calendar,
    Clock,
    User,
    Stethoscope,
    ArrowLeft,
    Shield,
    FileText,
    Pill,
    Activity,
    Printer,
    Plus,
    Trash2,
    CheckCircle2
} from 'lucide-react';
import {
    formatAppointmentDate,
    formatAppointmentTime,
    formatBookingTimestamp,
    getStatusBadgeStyle
} from '../utils/formatters';
import toast from 'react-hot-toast';

const AppointmentDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState<PatientAppointment | null>(null);
    const [tests, setTests] = useState<AppointmentTestItem[]>([]);
    const [catalog, setCatalog] = useState<TestCatalogItem[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string>('');
    const [instructions, setInstructions] = useState<string>('');
    const [submittingTest, setSubmittingTest] = useState(false);
    const [deletingTestId, setDeletingTestId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAppointment = async () => {
            if (!id) return;
            try {
                let data: PatientAppointment;
                if (user?.role === 'DOCTOR') {
                    data = await getDoctorAppointmentById(id);
                    try {
                        const cat = await getTestCatalog();
                        setCatalog(cat);
                    } catch (catErr) {
                        console.error('Failed to load test catalog:', catErr);
                    }
                } else {
                    data = await getMyAppointmentById(id);
                }
                setAppointment(data);
                setTests(data.tests || []);
            } catch (error: any) {
                const msg = error.response?.data?.error || 'Failed to load appointment details';
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointment();
    }, [id, user?.role]);

    const handleSuggestTest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !selectedTestId) {
            toast.error('Please select a clinical test from the catalog');
            return;
        }

        setSubmittingTest(true);
        try {
            const newTest = await suggestTest(id, Number(selectedTestId), instructions);
            toast.success('Clinical test suggested successfully');
            setTests(prev => [...prev, newTest]);
            setSelectedTestId('');
            setInstructions('');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to suggest test';
            toast.error(msg);
        } finally {
            setSubmittingTest(false);
        }
    };

    const handleRemoveTest = async (testId: number) => {
        if (!id) return;
        setDeletingTestId(testId);
        try {
            await removeTest(id, testId);
            toast.success('Test suggestion removed');
            setTests(prev => prev.filter(t => t.id !== testId));
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to remove test';
            toast.error(msg);
        } finally {
            setDeletingTestId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center h-64 items-center"><Spinner size={48} className="text-blue-600" /></div>;
    }

    if (!appointment) {
        return (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center space-y-4">
                <p className="text-gray-500 font-medium">Appointment not found or permission denied.</p>
                <Button onClick={() => navigate(-1)} variant="secondary">
                    Go Back
                </Button>
            </div>
        );
    }

    const statusStyle = getStatusBadgeStyle(appointment.status);
    const backPath = user?.role === 'DOCTOR' ? '/doctor/dashboard' : user?.role === 'ADMIN' ? '/admin/dashboard' : '/patient/dashboard';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Print Styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #appointment-record-card, #appointment-record-card * { visibility: visible; }
                    #appointment-record-card { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>

            {/* Back Button */}
            <div>
                <Link to={backPath} className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Dashboard
                </Link>
            </div>

            {/* Main Medical Record Card */}
            <div id="appointment-record-card" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Record Header */}
                <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-300 text-xs font-mono border border-slate-700">
                            <Activity className="w-3.5 h-3.5 text-blue-400" /> {appointment.bookingRef}
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Clinical Appointment Record</h1>
                        <p className="text-xs text-slate-400">Created: {formatBookingTimestamp(appointment.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle.badgeClass}`}>
                            {statusStyle.label}
                        </span>
                        <button
                            onClick={() => window.print()}
                            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            title="Print Record"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Details Body */}
                <div className="p-6 sm:p-8 space-y-8">
                    {/* Grid: Patient & Doctor Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Patient Panel */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                                <User className="w-4 h-4 text-blue-600" /> Patient Profile
                            </div>
                            <div className="space-y-1">
                                <p className="text-base font-bold text-slate-900">{appointment.patientName}</p>
                                <p className="text-xs text-slate-500 font-mono">
                                    Patient Code: <span className="font-semibold text-slate-800">{appointment.patientCode || `P-${String(appointment.patientId).padStart(6, '0')}`}</span>
                                </p>
                            </div>
                        </div>

                        {/* Doctor Panel */}
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                                <Stethoscope className="w-4 h-4 text-emerald-600" /> Attending Specialist
                            </div>
                            <div className="space-y-1">
                                <p className="text-base font-bold text-slate-900">{appointment.doctorName}</p>
                                <p className="text-xs text-blue-600 font-semibold">{appointment.specialization}</p>
                                {appointment.doctorCode && (
                                    <p className="text-[11px] text-slate-500 font-mono">Doctor Code: {appointment.doctorCode}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Schedule Timing Box */}
                    <div className="bg-blue-50/60 p-5 rounded-xl border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 uppercase font-medium">Scheduled Date</p>
                                <p className="text-sm font-bold text-slate-900">{formatAppointmentDate(appointment.date)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 uppercase font-medium">Scheduled Time</p>
                                <p className="text-sm font-bold text-slate-900">{formatAppointmentTime(appointment.time)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Workflows Section */}
                    <div className="border-t border-gray-200 pt-6 space-y-6">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" /> Clinical Consultation Desk
                        </h3>

                        <div className="grid grid-cols-1 gap-6">
                            {/* Suggested Tests Desk */}
                            <div className="p-5 rounded-xl border border-gray-200 bg-white space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        <FileText className="w-4 h-4 text-amber-500" /> Suggested Clinical Tests ({tests.length})
                                    </div>
                                    {user?.role === 'DOCTOR' && (
                                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            Doctor Ordering Mode
                                        </span>
                                    )}
                                </div>

                                {/* Doctor Form to Add Test */}
                                {user?.role === 'DOCTOR' && (
                                    <form onSubmit={handleSuggestTest} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                        <p className="text-xs font-bold text-slate-700">Suggest New Test</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Select Test</label>
                                                <select
                                                    value={selectedTestId}
                                                    onChange={(e) => setSelectedTestId(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white p-2 border"
                                                >
                                                    <option value="">-- Choose from Catalog --</option>
                                                    {catalog.map(cat => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {cat.name} ({cat.testCode}) - {cat.category}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Clinical Instructions (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Fasting 8 hours prior"
                                                    value={instructions}
                                                    onChange={(e) => setInstructions(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white p-2 border"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button type="submit" isLoading={submittingTest} disabled={!selectedTestId}>
                                                <Plus className="w-3.5 h-3.5 mr-1" /> Suggest Test
                                            </Button>
                                        </div>
                                    </form>
                                )}

                                {/* Test List Display */}
                                {tests.length === 0 ? (
                                    <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center space-y-1">
                                        <p className="text-xs text-slate-500">No clinical tests requested yet for this consultation session.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {tests.map(t => (
                                            <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                            {t.testCode}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-900">{t.name}</span>
                                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                                                            {t.category}
                                                        </span>
                                                    </div>
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

                                                {user?.role === 'DOCTOR' && (
                                                    <button
                                                        onClick={() => handleRemoveTest(t.id)}
                                                        disabled={deletingTestId === t.id}
                                                        className="inline-flex items-center text-xs text-rose-600 hover:text-rose-800 font-medium p-1.5 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-center"
                                                        title="Remove Test Suggestion"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Prescriptions Desk (Placeholder for future phases) */}
                            <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                    <Pill className="w-4 h-4 text-emerald-500" /> Digital Prescription
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    No digital prescription issued for this consultation session yet.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetails;
