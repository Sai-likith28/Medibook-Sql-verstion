import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDoctors, getDoctorSlots, bookSlot, getBookingById } from '../services/api';
import type { Doctor, Slot } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';
import {
    Stethoscope,
    Calendar,
    Clock,
    User,
    ArrowLeft,
    CheckCircle,
    Printer,
    Search,
    ChevronRight,
    ShieldCheck,
    Check
} from 'lucide-react';
import {
    formatBookingRef,
    formatAppointmentDate,
    formatAppointmentTime,
    formatBookingTimestamp
} from '../utils/formatters';

interface ReceiptData {
    bookingRef: string;
    bookingId: string | number;
    patientName: string;
    doctorName: string;
    specialization: string;
    date: string;
    time: string;
    status: string;
    createdAt: string;
}

const BookAppointment = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Data states
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);

    // Multi-step selection states
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [confirmedReceipt, setConfirmedReceipt] = useState<ReceiptData | null>(null);

    // Search & filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialization, setSelectedSpecialization] = useState('ALL');

    // Fetch doctors on mount
    useEffect(() => {
        const fetchDoctorsList = async () => {
            try {
                const data = await getDoctors();
                setDoctors(data);
            } catch (error) {
                toast.error('Failed to load doctor directory');
            } finally {
                setLoadingDoctors(false);
            }
        };

        fetchDoctorsList();
    }, []);

    // Fetch slots when doctor selected
    const handleSelectDoctor = async (doctor: Doctor) => {
        setSelectedDoctor(doctor);
        setSelectedSlot(null);
        setLoadingSlots(true);

        try {
            const slotData = await getDoctorSlots(doctor._id);
            setSlots(slotData);
        } catch (error) {
            toast.error('Failed to load doctor appointment slots');
        } finally {
            setLoadingSlots(false);
        }
    };

    // Execute booking
    const handleConfirmBooking = async () => {
        if (!selectedSlot || !selectedDoctor) return;

        setBookingLoading(true);
        try {
            // Patient identity strictly bound via req.user.patientId on backend
            const effectiveName = user?.name || user?.loginId || 'Patient';
            const booking = await bookSlot(selectedSlot._id, effectiveName);

            // Fetch expanded booking details
            let fullBooking = booking;
            try {
                if (booking && (booking._id || booking.id)) {
                    fullBooking = await getBookingById(booking._id || String(booking.id));
                }
            } catch (e) {
                console.warn('Using initial booking payload:', e);
            }

            const rawId = fullBooking.id || fullBooking._id || '1';
            const refCode = formatBookingRef(rawId);

            setConfirmedReceipt({
                bookingRef: refCode,
                bookingId: rawId,
                patientName: fullBooking.patientName || effectiveName,
                doctorName: fullBooking.doctorName || selectedDoctor.name,
                specialization: fullBooking.specialization || selectedDoctor.specialization,
                date: selectedSlot.date,
                time: selectedSlot.time,
                status: fullBooking.status || 'CONFIRMED',
                createdAt: fullBooking.createdAt || new Date().toISOString()
            });

            toast.success('Appointment booked successfully!');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to complete booking';
            toast.error(msg);
        } finally {
            setBookingLoading(false);
        }
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    // Filter doctors
    const specializations = ['ALL', ...Array.from(new Set(doctors.map(d => d.specialization)))];
    const filteredDoctors = doctors.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              doc.specialization.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSpec = selectedSpecialization === 'ALL' || doc.specialization === selectedSpecialization;
        return matchesSearch && matchesSpec;
    });

    // Group slots by date
    const slotsByDate: { [key: string]: Slot[] } = {};
    slots.forEach(slot => {
        const dateKey = slot.date ? slot.date.split('T')[0] : 'Scheduled Date';
        if (!slotsByDate[dateKey]) {
            slotsByDate[dateKey] = [];
        }
        slotsByDate[dateKey].push(slot);
    });

    const patientDisplayName = user?.name || 'Patient User';
    const patientCode = user?.patientCode || user?.loginId || 'P-000001';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Print Stylesheet Injection */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-receipt-card, #printable-receipt-card * { visibility: visible; }
                    #printable-receipt-card { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>

            {/* Back to Dashboard Link */}
            <div className="flex items-center justify-between">
                <Link to="/patient/dashboard" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Patient Dashboard
                </Link>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Authenticated Booking Portal
                </div>
            </div>

            {/* Header Banner */}
            <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Schedule Clinical Appointment</h1>
                    <p className="text-xs sm:text-sm text-slate-300">
                        Select an attending doctor, pick an available slot, and confirm your visit.
                    </p>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-xs space-y-0.5">
                    <p className="text-slate-400 font-medium">Patient Account</p>
                    <p className="text-white font-bold">{patientDisplayName}</p>
                    <p className="text-blue-400 font-mono text-[11px]">ID: {patientCode}</p>
                </div>
            </div>

            {/* If Receipt is Confirmed, Show Receipt View */}
            {confirmedReceipt ? (
                <div id="printable-receipt-card" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                                <CheckCircle className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-mono font-bold border border-emerald-200">
                                    {confirmedReceipt.bookingRef}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mt-1">Appointment Successfully Confirmed</h2>
                                <p className="text-xs text-slate-500">Official MediBook Appointment Receipt</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrintReceipt}
                                className="inline-flex items-center px-3.5 py-2 border border-gray-300 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm gap-1.5"
                            >
                                <Printer className="w-4 h-4 text-slate-500" />
                                Print Receipt
                            </button>
                            <Link
                                to={`/patient/appointments/${confirmedReceipt.bookingId}`}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm gap-1.5"
                            >
                                View Appointment
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Receipt Body Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200 text-xs">
                        <div className="space-y-3">
                            <div className="border-b border-slate-200 pb-2 font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-blue-600" /> Patient Details
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="font-bold text-slate-900">{confirmedReceipt.patientName}</p>
                                <p className="text-xs text-slate-500 font-mono">Patient Code: {patientCode}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="border-b border-slate-200 pb-2 font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-emerald-600" /> Attending Specialist
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="font-bold text-slate-900">{confirmedReceipt.doctorName}</p>
                                <p className="text-xs text-blue-600 font-semibold">{confirmedReceipt.specialization}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="border-b border-slate-200 pb-2 font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-indigo-600" /> Scheduled Visit Date
                            </div>
                            <p className="text-sm font-bold text-slate-900">{formatAppointmentDate(confirmedReceipt.date)}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="border-b border-slate-200 pb-2 font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-purple-600" /> Scheduled Time Slot
                            </div>
                            <p className="text-sm font-bold text-slate-900">{formatAppointmentTime(confirmedReceipt.time)}</p>
                        </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex justify-between items-center border-t border-gray-200 pt-4 text-xs text-slate-500">
                        <span>Created: {formatBookingTimestamp(confirmedReceipt.createdAt)}</span>
                        <Button onClick={() => navigate('/patient/dashboard')} variant="secondary">
                            Return to Dashboard
                        </Button>
                    </div>
                </div>
            ) : (
                /* Multi-step Booking Interface */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel: Step 1 Doctor Selector */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                    Select Doctor
                                </h3>
                                {selectedDoctor && (
                                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" /> Doctor Selected
                                    </span>
                                )}
                            </div>

                            {/* Filters */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search doctor or specialty..."
                                        className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>

                                <select
                                    value={selectedSpecialization}
                                    onChange={(e) => setSelectedSpecialization(e.target.value)}
                                    className="w-full text-xs py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    {specializations.map(spec => (
                                        <option key={spec} value={spec}>
                                            {spec === 'ALL' ? 'All Specializations' : spec}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Doctor List */}
                            {loadingDoctors ? (
                                <div className="flex justify-center py-8"><Spinner /></div>
                            ) : filteredDoctors.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-6">No doctors found matching criteria.</p>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                    {filteredDoctors.map((doc) => {
                                        const isSelected = selectedDoctor?._id === doc._id;
                                        return (
                                            <div
                                                key={doc._id}
                                                onClick={() => handleSelectDoctor(doc)}
                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                    isSelected
                                                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="space-y-0.5">
                                                    <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                                                    <p className="text-[11px] text-blue-600 font-semibold">{doc.specialization}</p>
                                                    {doc.doctorCode && (
                                                        <p className="text-[10px] text-slate-400 font-mono">Code: {doc.doctorCode}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant={isSelected ? 'primary' : 'secondary'}
                                                    className="text-[11px] px-2.5 py-1"
                                                >
                                                    {isSelected ? 'Selected' : 'View Slots'}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Step 2 & Step 3 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Step 2: Slot Selection */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                                    Select Appointment Date & Time Slot
                                </h3>
                                {selectedDoctor && (
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {selectedDoctor.name} ({selectedDoctor.specialization})
                                    </span>
                                )}
                            </div>

                            {!selectedDoctor ? (
                                <div className="p-10 text-center space-y-2 border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
                                    <Stethoscope className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="text-xs font-medium text-slate-500">Please select an attending doctor from Step 1 on the left.</p>
                                </div>
                            ) : loadingSlots ? (
                                <div className="flex justify-center py-12"><Spinner size={36} className="text-blue-600" /></div>
                            ) : slots.length === 0 ? (
                                <div className="p-8 text-center space-y-2 border border-gray-200 rounded-xl bg-slate-50">
                                    <p className="text-xs text-slate-500">No appointment slots currently available for {selectedDoctor.name}.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.keys(slotsByDate).map(dateKey => (
                                        <div key={dateKey} className="space-y-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border-b border-slate-100 pb-1">
                                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                {formatAppointmentDate(dateKey)}
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {slotsByDate[dateKey].map(slot => {
                                                    const isSelected = selectedSlot?._id === slot._id;
                                                    const isBooked = slot.isBooked;

                                                    return (
                                                        <button
                                                            key={slot._id}
                                                            disabled={isBooked}
                                                            onClick={() => setSelectedSlot(slot)}
                                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                                isBooked
                                                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                                                                    : isSelected
                                                                    ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-blue-600/30 shadow-sm'
                                                                    : 'bg-white border-gray-200 hover:border-blue-400 text-slate-800'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between text-xs font-bold font-mono">
                                                                <span>{formatAppointmentTime(slot.time)}</span>
                                                                {isBooked ? (
                                                                    <span className="text-[10px] text-gray-500 uppercase font-sans">Booked</span>
                                                                ) : isSelected ? (
                                                                    <Check className="w-4 h-4 text-white" />
                                                                ) : null}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Step 3: Confirmation Summary */}
                        {selectedDoctor && selectedSlot && (
                            <div className="bg-slate-900 rounded-xl p-6 text-white space-y-4 shadow-sm border border-slate-800">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                                        Confirm Appointment Summary
                                    </h3>
                                    <span className="text-xs text-blue-400 font-semibold">Ready to Schedule</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60 space-y-1">
                                        <p className="text-[11px] text-slate-400 uppercase font-medium">Attending Doctor</p>
                                        <p className="text-sm font-bold text-white">{selectedDoctor.name}</p>
                                        <p className="text-xs text-blue-400 font-semibold">{selectedDoctor.specialization}</p>
                                    </div>

                                    <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60 space-y-1">
                                        <p className="text-[11px] text-slate-400 uppercase font-medium">Schedule Time</p>
                                        <p className="text-sm font-bold text-white">{formatAppointmentDate(selectedSlot.date)}</p>
                                        <p className="text-xs text-emerald-400 font-mono font-semibold">{formatAppointmentTime(selectedSlot.time)}</p>
                                    </div>
                                </div>

                                <div className="bg-blue-950/60 p-3.5 rounded-lg border border-blue-800/50 text-xs space-y-1">
                                    <p className="text-[11px] text-blue-300 uppercase font-bold tracking-wider">Patient Identity (Verified Session)</p>
                                    <p className="text-white font-bold text-sm">{patientDisplayName}</p>
                                    <p className="text-slate-400 font-mono text-[11px]">Patient Code: {patientCode}</p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleConfirmBooking}
                                        isLoading={bookingLoading}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm"
                                    >
                                        Confirm Appointment
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookAppointment;
