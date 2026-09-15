import { useEffect, useState } from 'react';
import { getDoctors } from '../services/api';
import type { Doctor } from '../services/api';
import DoctorCard from '../components/DoctorCard';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const Home = () => {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const data = await getDoctors();
                setDoctors(data);
            } catch (error) {
                toast.error('Failed to fetch doctors');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size={48} className="text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Find a Doctor</h1>
                    <p className="mt-1 text-sm text-gray-500">Book an appointment with our specialists.</p>
                </div>
            </div>

            {doctors.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No doctors found. Please check back later.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {doctors.map((doctor) => (
                        <DoctorCard key={doctor._id} doctor={doctor} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Home;
