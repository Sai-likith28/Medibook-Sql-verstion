import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoctorSlots, bookSlot, getDoctors } from '../services/api';
import type { Slot, Doctor } from '../services/api';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import Input from '../components/Input';
import toast from 'react-hot-toast';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';

const DoctorDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [slots, setSlots] = useState<Slot[]>([]);
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [patientName, setPatientName] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    // Fetch doctor info (could be optimized if we had a getDoctorById endpoint, using getDoctors for now or assuming we could pass state)
    // But reliable way is to fetch. Since backend only has getDoctors list, we'll fetch all and find one. 
    // Ideally backend should have GET /doctors/:id.

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
        if (!selectedSlot || !patientName.trim()) return;

        setBookingLoading(true);
        try {
            await bookSlot(selectedSlot._id, patientName);
            toast.success('Booking confirmed!');

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

    if (loading) {
        return <div className="flex justify-center h-64 items-center"><Spinner /></div>;
    }

    if (!doctor) {
        return <div>Doctor not found</div>;
    }

    return (
        <div className="space-y-6">
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
                            const date = new Date(slot.date).toLocaleDateString();
                            return (
                                <li key={slot._id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                            {date}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Clock className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                            {slot.time}
                                        </div>
                                        {slot.isBooked && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Booked
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
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
                        <strong>{selectedSlot && new Date(selectedSlot.date).toLocaleDateString()}</strong> at{' '}
                        <strong>{selectedSlot?.time}</strong>.
                    </p>
                    <Input
                        label="Patient Name"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Enter your full name"
                        autoFocus
                    />
                </div>
            </Modal>
        </div>
    );
};

export default DoctorDetails;
