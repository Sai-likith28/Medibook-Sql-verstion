import { useEffect, useState } from 'react';
import {
    getReport,
    type DoctorUtilizationReport,
    type DailySummaryReport,
    type PatientActivityReport,
    type PeakBookingTimeReport,
    type SpecializationDemandReport,
    type BookingAuditLifecycleReport,
    type ValidReportName
} from '../services/api';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import { BarChart3, Users, Calendar, Clock, Stethoscope, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface ReportState<T> {
    data: T[] | null;
    loading: boolean;
    error: string | null;
}

const AdminReports = () => {
    const [activeTab, setActiveTab] = useState<ValidReportName>('doctor-utilization');

    // Report States
    const [utilization, setUtilization] = useState<ReportState<DoctorUtilizationReport>>({ data: null, loading: true, error: null });
    const [dailySummary, setDailySummary] = useState<ReportState<DailySummaryReport>>({ data: null, loading: true, error: null });
    const [patientActivity, setPatientActivity] = useState<ReportState<PatientActivityReport>>({ data: null, loading: true, error: null });
    const [peakTime, setPeakTime] = useState<ReportState<PeakBookingTimeReport>>({ data: null, loading: true, error: null });
    const [specialization, setSpecialization] = useState<ReportState<SpecializationDemandReport>>({ data: null, loading: true, error: null });
    const [auditLifecycle, setAuditLifecycle] = useState<ReportState<BookingAuditLifecycleReport>>({ data: null, loading: true, error: null });

    const fetchAllReports = async () => {
        // Fetch each report independently to prevent single-point failures
        fetchSingleReport<DoctorUtilizationReport>('doctor-utilization', setUtilization);
        fetchSingleReport<DailySummaryReport>('daily-summary', setDailySummary);
        fetchSingleReport<PatientActivityReport>('patient-activity', setPatientActivity);
        fetchSingleReport<PeakBookingTimeReport>('peak-booking-time', setPeakTime);
        fetchSingleReport<SpecializationDemandReport>('specialization-demand', setSpecialization);
        fetchSingleReport<BookingAuditLifecycleReport>('booking-audit-lifecycle', setAuditLifecycle);
    };

    const fetchSingleReport = async <T,>(
        name: ValidReportName,
        setState: React.Dispatch<React.SetStateAction<ReportState<T>>>
    ) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const data = await getReport<T>(name);
            setState({ data, loading: false, error: null });
        } catch (err: any) {
            console.error(`Failed to load report ${name}:`, err);
            setState({ data: null, loading: false, error: 'Unable to load report data. Please try again.' });
        }
    };

    useEffect(() => {
        fetchAllReports();
    }, []);

    const reportTabs: { id: ValidReportName; label: string; icon: React.ReactNode }[] = [
        { id: 'doctor-utilization', label: 'Doctor Utilization', icon: <Stethoscope className="w-4 h-4 mr-1.5" /> },
        { id: 'daily-summary', label: 'Daily Summary', icon: <Calendar className="w-4 h-4 mr-1.5" /> },
        { id: 'patient-activity', label: 'Patient Activity', icon: <Users className="w-4 h-4 mr-1.5" /> },
        { id: 'peak-booking-time', label: 'Peak Booking Hours', icon: <Clock className="w-4 h-4 mr-1.5" /> },
        { id: 'specialization-demand', label: 'Department Capacity', icon: <BarChart3 className="w-4 h-4 mr-1.5" /> },
        { id: 'booking-audit-lifecycle', label: 'Audit Lifecycle', icon: <ShieldCheck className="w-4 h-4 mr-1.5" /> },
    ];

    const renderEmptyState = (message = 'No data available for this report.') => (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{message}</p>
        </div>
    );

    const renderErrorState = (error: string, onRetry: () => void) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
            <p className="text-red-700 font-medium mb-4">{error}</p>
            <Button variant="secondary" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Retry Report
            </Button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SQL Analytics & Analytical Reports</h1>
                    <p className="text-sm text-gray-500">Read-only analytical insights derived directly from MySQL database views.</p>
                </div>
                <Button variant="secondary" onClick={fetchAllReports}>
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh All Data
                </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="-mb-px flex space-x-6 min-w-max">
                    {reportTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-4">
                {/* 1. DOCTOR UTILIZATION REPORT */}
                {activeTab === 'doctor-utilization' && (
                    <div>
                        {utilization.loading ? (
                            <div className="flex justify-center p-12"><Spinner /></div>
                        ) : utilization.error ? (
                            renderErrorState(utilization.error, () => fetchSingleReport('doctor-utilization', setUtilization))
                        ) : !utilization.data || utilization.data.length === 0 ? (
                            renderEmptyState('No doctor utilization data found.')
                        ) : (
                            <div className="space-y-6">
                                {/* Summary Metric Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Doctors</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">{utilization.data.length}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Offerings (Slots)</p>
                                        <p className="text-2xl font-bold text-blue-600 mt-1">
                                            {utilization.data.reduce((acc, curr) => acc + Number(curr.total_slots || 0), 0)}
                                        </p>
                                    </div>
                                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Confirmed Bookings</p>
                                        <p className="text-2xl font-bold text-green-600 mt-1">
                                            {utilization.data.reduce((acc, curr) => acc + Number(curr.confirmed_bookings || 0), 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                        <h3 className="text-base font-semibold text-gray-900">Doctor Performance & Utilization Schedule</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Slots</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Confirmed</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Failed</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {utilization.data.map((row) => (
                                                    <tr key={row.doctor_id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.doctor_name}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">{row.specialization}</td>
                                                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{row.total_slots}</td>
                                                        <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">{row.confirmed_bookings}</td>
                                                        <td className="px-6 py-4 text-sm text-right text-red-600">{row.failed_bookings}</td>
                                                        <td className="px-6 py-4 text-sm text-right text-gray-500">{row.available_slots}</td>
                                                        <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                                                            {row.utilization_rate_pct != null ? `${Number(row.utilization_rate_pct).toFixed(2)}%` : '0.00%'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. DAILY SUMMARY REPORT */}
                {activeTab === 'daily-summary' && (
                    <div>
                        {dailySummary.loading ? (
                            <div className="flex justify-center p-12"><Spinner /></div>
                        ) : dailySummary.error ? (
                            renderErrorState(dailySummary.error, () => fetchSingleReport('daily-summary', setDailySummary))
                        ) : !dailySummary.data || dailySummary.data.length === 0 ? (
                            renderEmptyState('No daily appointment activity found in the last 30 days.')
                        ) : (
                            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-900">Daily Appointment Summary (±30 Day Window)</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appointment Date</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Slots</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Confirmed</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Failed</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Confirmation Rate (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {dailySummary.data.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        {new Date(row.appointment_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">{row.total_slots}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">{row.confirmed_bookings}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-yellow-600">{row.pending_bookings}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-red-600">{row.failed_bookings}</td>
                                                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                                                        {row.confirmation_rate_pct != null ? `${Number(row.confirmation_rate_pct).toFixed(2)}%` : '0.00%'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. PATIENT ACTIVITY REPORT */}
                {activeTab === 'patient-activity' && (
                    <div>
                        {patientActivity.loading ? (
                            <div className="flex justify-center p-12"><Spinner /></div>
                        ) : patientActivity.error ? (
                            renderErrorState(patientActivity.error, () => fetchSingleReport('patient-activity', setPatientActivity))
                        ) : !patientActivity.data || patientActivity.data.length === 0 ? (
                            renderEmptyState('No patient activity records found.')
                        ) : (
                            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-900">Patient Appointment Activity & Booking Leaderboard</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Booking Attempts</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Confirmed Appointments</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Failed Appointments</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Last Booking Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {patientActivity.data.map((row) => (
                                                <tr key={row.patient_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.patient_name}</td>
                                                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{row.total_booking_attempts}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">{row.confirmed_appointments}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-red-600">{row.failed_appointments}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-gray-500">
                                                        {row.last_booking_date ? new Date(row.last_booking_date).toLocaleString() : 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. PEAK BOOKING TIME REPORT */}
                {activeTab === 'peak-booking-time' && (
                    <div>
                        {peakTime.loading ? (
                            <div className="flex justify-center p-12"><Spinner /></div>
                        ) : peakTime.error ? (
                            renderErrorState(peakTime.error, () => fetchSingleReport('peak-booking-time', setPeakTime))
                        ) : !peakTime.data || peakTime.data.length === 0 ? (
                            renderEmptyState('No time slot distribution data available.')
                        ) : (
                            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-900">Peak Booking Time Distribution Analysis</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Window</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot Hour</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Slots Offered</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Booked Slots</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Fill Rate Visual</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fill Rate (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {peakTime.data.map((row, idx) => {
                                                const fillPct = row.booking_fill_rate_pct != null ? Number(row.booking_fill_rate_pct) : 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.time_window}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">{row.slot_hour}</td>
                                                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{row.total_slots_offered}</td>
                                                        <td className="px-6 py-4 text-sm text-right text-blue-600 font-semibold">{row.total_booked_slots}</td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                                <div
                                                                    className="bg-blue-600 h-2.5 rounded-full transition-all"
                                                                    style={{ width: `${Math.min(100, Math.max(0, fillPct))}%` }}
                                                                ></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                                                            {fillPct.toFixed(2)}%
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. SPECIALIZATION DEMAND REPORT */}
                {activeTab === 'specialization-demand' && (
                    <div>
                        {specialization.loading ? (
                            <div className="flex justify-center p-12"><Spinner /></div>
                        ) : specialization.error ? (
                            renderErrorState(specialization.error, () => fetchSingleReport('specialization-demand', setSpecialization))
                        ) : !specialization.data || specialization.data.length === 0 ? (
                            renderEmptyState('No specialization demand data found.')
                        ) : (
                            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-900">Specialization Capacity & Department Demand</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Doctor Count</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Department Slots</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Confirmed Bookings</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Failed Bookings</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Department Fill Rate (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {specialization.data.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.specialization}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-gray-700">{row.doctor_count}</td>
                                                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{row.total_department_slots}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">{row.confirmed_bookings}</td>
                                                    <td className="px-6 py-4 text-sm text-right text-red-600">{row.failed_bookings}</td>
                                                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                                                        {row.department_fill_rate_pct != null ? `${Number(row.department_fill_rate_pct).toFixed(2)}%` : '0.00%'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 6. BOOKING AUDIT LIFECYCLE METRIC REPORT */}
                {activeTab === 'booking-audit-lifecycle' && (
                    <div>
                        {auditLifecycle.loading ? (
                            <div className="flex justify-center p-12"><Spinner /></div>
                        ) : auditLifecycle.error ? (
                            renderErrorState(auditLifecycle.error, () => fetchSingleReport('booking-audit-lifecycle', setAuditLifecycle))
                        ) : !auditLifecycle.data || auditLifecycle.data.length === 0 ? (
                            renderEmptyState('No booking audit lifecycle records found.')
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
                                    <strong>Aggregated Lifecycle Metrics:</strong> This report displays aggregate transition event counts recorded by the <code>booking_audit</code> database triggers (NOT a live event stream).
                                </div>

                                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                        <h3 className="text-base font-semibold text-gray-900">Booking Audit Lifecycle & Status Transition Metrics</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audit Action</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Status</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Events</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total Audit Events</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {auditLifecycle.data.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{row.audit_action}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">{row.previous_status}</td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                                row.new_status === 'CONFIRMED'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : row.new_status === 'FAILED'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {row.new_status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{row.total_events}</td>
                                                        <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                                                            {row.pct_of_total_events != null ? `${Number(row.pct_of_total_events).toFixed(2)}%` : '0.00%'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
