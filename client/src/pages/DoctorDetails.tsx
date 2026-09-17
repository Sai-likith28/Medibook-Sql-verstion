import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoctorSlots, bookSlot, getDoctors, getBookingById } from '../services/api';
import type { Slot, Doctor } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import Input from '../components/Input';
import toast from 'react-hot-toast';
import { Calendar, Clock, ArrowLeft, Printer, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    formatBookingRef,
    formatAppointmentDate,
    formatAppointmentTime,
    formatBookingTimestamp,
    getStatusBadgeStyle
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

const DoctorDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [slots, setSlots] = useState<Slot[]>([]);
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [patientName, setPatientName] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [confirmedReceipt, setConfirmedReceipt] = useState<ReceiptData | null>(null);

    const isAuthenticatedPatient = user && user.role === 'PATIENT';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [doctorsRes, slotsRes] = await Promise.all([
                    getDoctors(),
                    getDoctorSlots(id!)
                ]);

                const doc = doctorsRes.find(d => d._id === id);
                setDoctor(doc || null);
                setSlots(slotsRes);
            } catch (error) {
                toast.error('Failed to load doctor details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const handleBook = async () => {
        const effectiveName = isAuthenticatedPatient ? (user?.name || user?.loginId || 'Patient') : patientName;

        if (!selectedSlot || (!isAuthenticatedPatient && !effectiveName.trim())) return;

        setBookingLoading(true);
        try {
            const booking = await bookSlot(selectedSlot._id, effectiveName);

            // Fetch full booking details from backend GET /bookings/:id to ensure accurate receipt fields
            let fullBooking = booking;
            try {
                if (booking && (booking._id || booking.id)) {
                    fullBooking = await getBookingById(booking._id || String(booking.id));
                }
            } catch (e) {
                console.warn('Could not fetch expanded booking details, using returned booking:', e);
            }

            const rawId = fullBooking.id || fullBooking._id || '1';
            const refCode = formatBookingRef(rawId);

            setConfirmedReceipt({
                bookingRef: refCode,
                bookingId: rawId,
                patientName: fullBooking.patientName || effectiveName,
                doctorName: fullBooking.doctorName || doctor?.name || 'Unknown Doctor',
                specialization: fullBooking.specialization || doctor?.specialization || 'General',
                date: selectedSlot.date,
                time: selectedSlot.time,
                status: fullBooking.status || 'CONFIRMED',
                createdAt: fullBooking.createdAt || new Date().toISOString()
            });

            // Update local state
            setSlots(prev => prev.map(s => s._id === selectedSlot._id ? { ...s, isBooked: true } : s));
            setSelectedSlot(null);
            setPatientName('');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Booking failed';
            toast.error(msg);
        } finally {
            setBookingLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="flex justify-center h-64 items-center"><Spinner /></div>;
    }

    if (!doctor) {
        return <div>Doctor not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Print Stylesheet Injection */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible; }
                    #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>

            <div>
                <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to Doctors
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">{doctor.name}</h1>
                <p className="text-lg text-blue-600">{doctor.specialization}</p>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Available Slots</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                    {slots.length === 0 ? (
                        <li className="px-4 py-8 text-center text-gray-500">No slots available.</li>
                    ) : (
                        slots.map((slot) => {
                            const date = formatAppointmentDate(slot.date);
                            const time = formatAppointmentTime(slot.time);
                            return (
                                <li key={slot._id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                            {date}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                            {time}
                                        </div>
                                        {slot.isBooked && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Booked
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        disabled={slot.isBooked}
                                        onClick={() => setSelectedSlot(slot)}
                                        variant={slot.isBooked ? 'ghost' : 'primary'}
                                    >
                                        {slot.isBooked ? 'Unavailable' : 'Book Slot'}
                                    </Button>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>

            {/* Modal 1: Booking Input Form */}
            <Modal
                isOpen={!!selectedSlot}
                onClose={() => setSelectedSlot(null)}
                title="Confirm Booking"
                footer={
                    <>
                        <Button
                            className="w-full sm:ml-3 sm:w-auto"
                            onClick={handleBook}
                            isLoading={bookingLoading}
                        >
                            Confirm
                        </Button>
                        <Button
                            className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
                            variant="secondary"
                            onClick={() => setSelectedSlot(null)}
                        >
                            Cancel
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Booking appointment with <strong>{doctor.name}</strong> on{' '}
                        <strong>{selectedSlot && formatAppointmentDate(selectedSlot.date)}</strong> at{' '}
                        <strong>{selectedSlot && formatAppointmentTime(selectedSlot.time)}</strong>.
                    </p>
                    {isAuthenticatedPatient ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                            <p className="font-semibold text-blue-900 uppercase tracking-wider text-[11px]">Authenticated Patient Account</p>
                            <p className="text-slate-800 text-sm font-bold">{user.name || user.loginId}</p>
                            <p className="text-slate-500 font-mono text-[11px]">Patient Code: {user.patientCode || user.loginId}</p>
                        </div>
                    ) : (
                        <Input
                            label="Patient Name"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="Enter your full name"
                            autoFocus
                        />
                    )}
                </div>
            </Modal>

            {/* Modal 2: Confirmation & Receipt Modal */}
            <Modal
                isOpen={!!confirmedReceipt}
                onClose={() => setConfirmedReceipt(null)}
                title="Appointment Booking Receipt"
                footer={
                    <>
                        <Button
                            className="w-full sm:ml-3 sm:w-auto"
                            onClick={() => setConfirmedReceipt(null)}
                        >
                            Done
                        </Button>
                        <Button
                            className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
                            variant="secondary"
                            onClick={handlePrint}
                        >
                            <Printer className="w-4 h-4 mr-1.5" />
                            Print Receipt
                        </Button>
                    </>
                }
            >
                {confirmedReceipt && (() => {
                    const statusInfo = getStatusBadgeStyle(confirmedReceipt.status);
                    return (
                        <div id="printable-receipt" className="space-y-4 p-2 bg-white rounded-md border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                    <span className="text-lg font-bold text-gray-900">Booking Confirmed</span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.badgeClass}`}>
                                    {statusInfo.label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Booking Reference</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{confirmedReceipt.bookingRef}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Patient Name</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{confirmedReceipt.patientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Doctor</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{confirmedReceipt.doctorName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Specialization</p>
                                    <p className="text-sm font-semibold text-blue-600 mt-0.5">{confirmedReceipt.specialization}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Appointment Date</p>
                                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                                        {formatAppointmentDate(confirmedReceipt.date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Appointment Time</p>
                                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                                        {formatAppointmentTime(confirmedReceipt.time)}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                                <span>MediBook SQL System</span>
                                <span>{formatBookingTimestamp(confirmedReceipt.createdAt)}</span>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default DoctorDetails;
