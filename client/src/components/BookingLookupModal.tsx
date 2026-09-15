import React, { useState } from 'react';
import { getBookingById, type Booking } from '../services/api';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { Search, Calendar, Clock, User, Stethoscope, AlertCircle, CheckCircle2, XCircle, Clock3 } from 'lucide-react';

interface BookingLookupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BookingLookupModal: React.FC<BookingLookupModalProps> = ({ isOpen, onClose }) => {
    const [referenceInput, setReferenceInput] = useState('');
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [notFoundError, setNotFoundError] = useState<string | null>(null);

    const handleReset = () => {
        setReferenceInput('');
        setBooking(null);
        setValidationError(null);
        setNotFoundError(null);
    };

    const handleCloseModal = () => {
        handleReset();
        onClose();
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        setValidationError(null);
        setNotFoundError(null);
        setBooking(null);

        const trimmed = referenceInput.trim();

        if (!trimmed) {
            setValidationError('Please enter a booking reference.');
            return;
        }

        // Validate exact presentation format: BK- followed by exactly 6 digits (e.g. BK-000001)
        const exactRefRegex = /^BK-\d{6}$/i;
        if (!exactRefRegex.test(trimmed)) {
            setValidationError('Invalid reference format. Please enter a booking reference in the format BK-XXXXXX (e.g. BK-000001).');
            return;
        }

        // Extract numeric ID
        const numericStr = trimmed.substring(3);
        const bookingId = parseInt(numericStr, 10);

        setLoading(true);

        try {
            const data = await getBookingById(String(bookingId));
            setBooking(data);
        } catch (err: any) {
            if (err.response && err.response.status === 404) {
                const formattedRef = `BK-${String(bookingId).padStart(6, '0')}`;
                setNotFoundError(`No booking record found for reference ${formattedRef}. Please check your ID and try again.`);
            } else {
                setNotFoundError('Failed to retrieve booking details. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
                        CONFIRMED
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        <Clock3 className="w-3.5 h-3.5 mr-1 text-yellow-600" />
                        PENDING
                    </span>
                );
            case 'FAILED':
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                        FAILED
                    </span>
                );
        }
    };

    const slotDetail = booking && typeof booking.slotId === 'object' ? booking.slotId : null;
    const formattedDate = slotDetail?.date ? new Date(slotDetail.date).toLocaleDateString() : 'N/A';
    const formattedTime = slotDetail?.time || 'N/A';
    const displayRef = booking ? `BK-${String(booking.id || booking._id).padStart(6, '0')}` : '';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCloseModal}
            title={booking ? "Appointment Booking Details" : "Find My Booking"}
            footer={
                booking ? (
                    <>
                        <Button className="w-full sm:w-auto" onClick={handleCloseModal}>
                            Done
                        </Button>
                        <Button className="w-full sm:w-auto mt-2 sm:mt-0" variant="secondary" onClick={handleReset}>
                            Search Another
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={handleSearch}
                            isLoading={loading}
                        >
                            <Search className="w-4 h-4 mr-1.5" />
                            Find Booking
                        </Button>
                        <Button
                            className="w-full sm:w-auto mt-2 sm:mt-0"
                            variant="secondary"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </Button>
                    </>
                )
            }
        >
            {!booking ? (
                <form onSubmit={handleSearch} className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Enter your booking reference ID below to view your appointment details and real-time status.
                    </p>

                    <Input
                        label="Booking Reference Number"
                        value={referenceInput}
                        onChange={(e) => setReferenceInput(e.target.value)}
                        placeholder="e.g. BK-000001"
                        error={validationError || undefined}
                        autoFocus
                    />

                    {notFoundError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <span>{notFoundError}</span>
                        </div>
                    )}
                </form>
            ) : (
                <div className="space-y-4 p-2 bg-white rounded-md border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Booking Reference</span>
                            <span className="text-lg font-bold text-gray-900">{displayRef}</span>
                        </div>
                        <div>{renderStatusBadge(booking.status)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-gray-400" /> Patient Name
                            </p>
                            <p className="text-sm font-semibold text-gray-900 mt-0.5">{booking.patientName}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-gray-400" /> Doctor
                            </p>
                            <p className="text-sm font-semibold text-gray-900 mt-0.5">{booking.doctorName || 'Unknown Doctor'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Specialization</p>
                            <p className="text-sm font-semibold text-blue-600 mt-0.5">{booking.specialization || 'General'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" /> Date
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5">{formattedDate}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" /> Time
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-0.5">{formattedTime}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Created On</p>
                            <p className="text-sm font-medium text-gray-500 mt-0.5">
                                {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default BookingLookupModal;
