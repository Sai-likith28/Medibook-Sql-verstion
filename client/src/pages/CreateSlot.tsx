import React, { useEffect, useState } from 'react';
import { createSlot, getDoctors } from '../services/api';
import type { Doctor } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateSlot = () => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [doctorId, setDoctorId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch doctors for dropdown
        getDoctors().then(setDoctors).catch(() => toast.error('Failed to fetch doctors'));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!doctorId || !date || !time) {
            toast.error('Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            await createSlot({ doctorId, date, time });
            toast.success('Slot created successfully');
            // Optional: reset form or navigate
            // navigate('/admin');
            // Keep on page to add more slots?
            toast.success('You can add another one.');
            setTime(''); // Clear time only?
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to create slot';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="mb-6">
                <Link to="/admin" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">Add Availability Slot</h1>
            </div>

            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                <form className="space-y-6" onSubmit={handleSubmit}>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                        <select
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                            value={doctorId}
                            onChange={(e) => setDoctorId(e.target.value)}
                            required
                        >
                            <option value="">-- Select a Doctor --</option>
                            {doctors.map(doc => (
                                <option key={doc._id} value={doc._id}>{doc.name} ({doc.specialization})</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        type="date"
                        label="Date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        // min={new Date().toISOString().split('T')[0]} // Optional: prevent past dates
                        required
                    />

                    <Input
                        type="time"
                        label="Time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                    />

                    <div className="pt-2">
                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={loading}
                            disabled={!doctorId}
                        >
                            Create Slot
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSlot;
