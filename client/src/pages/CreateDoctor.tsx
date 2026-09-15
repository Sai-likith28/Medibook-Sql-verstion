import React, { useState } from 'react';
import { createDoctor } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateDoctor = () => {
    const [name, setName] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !specialization) {
            toast.error('Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            await createDoctor({ name, specialization });
            toast.success('Doctor created successfully');
            navigate('/admin');
        } catch (error) {
            toast.error('Failed to create doctor');
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
                <h1 className="mt-2 text-2xl font-bold text-gray-900">Add New Doctor</h1>
            </div>

            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <Input
                        label="Doctor Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. House"
                        required
                        autoFocus
                    />

                    <Input
                        label="Specialization"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Diagnostic Medicine"
                        required
                    />

                    <div className="pt-2">
                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={loading}
                        >
                            Create Doctor
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDoctor;
