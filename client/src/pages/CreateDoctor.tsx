import React, { useState } from 'react';
import { createDoctor } from '../services/api';
import type { CreateDoctorResponse } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Copy, Key, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateDoctor = () => {
    const [name, setName] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [createdResult, setCreatedResult] = useState<CreateDoctorResponse | null>(null);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !specialization) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const result = await createDoctor({
                name: name.trim(),
                specialization: specialization.trim(),
                email: email.trim() || undefined,
                password: password.trim() || undefined
            });

            setCreatedResult(result);
            toast.success('Doctor account created successfully!');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Failed to create doctor account';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="mb-6">
                <Link to="/admin" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">Add New Doctor</h1>
                <p className="text-xs text-gray-500 mt-1">
                    Creates doctor record and linked authentication user account.
                </p>
            </div>

            {createdResult ? (
                <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm font-semibold">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span>Doctor Account Created Successfully!</span>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                        <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                            Generated Authentication Credentials:
                        </p>
                        
                        <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-200">
                            <span className="text-slate-500 font-medium">Doctor Name:</span>
                            <span className="font-bold text-slate-900">{createdResult.name}</span>
                        </div>

                        <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-200">
                            <span className="text-slate-500 font-medium">Specialization:</span>
                            <span className="text-slate-800">{createdResult.specialization}</span>
                        </div>

                        <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-200">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Doctor Code (Login ID):
                            </span>
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {createdResult.doctorCode}
                            </span>
                        </div>

                        <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-200">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Key className="w-3.5 h-3.5 text-amber-600" /> Temporary Password:
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    {createdResult.tempPassword}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(createdResult.tempPassword || '')}
                                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                                    title="Copy Password"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <strong>Important:</strong> Convey the Doctor Code and Temporary Password to the doctor. This temporary password is only displayed once upon creation.
                    </p>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            className="flex-1 text-xs"
                            onClick={() => {
                                setCreatedResult(null);
                                setName('');
                                setSpecialization('');
                                setEmail('');
                                setPassword('');
                            }}
                        >
                            Add Another Doctor
                        </Button>
                        <Button
                            className="flex-1 text-xs bg-purple-600 hover:bg-purple-700"
                            onClick={() => navigate('/admin')}
                        >
                            Return to Admin Dashboard
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <Input
                            label="Doctor Name *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Doctor 3"
                            required
                            autoFocus
                        />

                        <Input
                            label="Specialization *"
                            value={specialization}
                            onChange={(e) => setSpecialization(e.target.value)}
                            placeholder="e.g. Cardiology"
                            required
                        />

                        <Input
                            label="Email Address (Optional, .test domain)"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. doctor3@example.test"
                        />

                        <Input
                            label="Initial Password (Optional - auto-generated if blank)"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank for auto-generated temporary password"
                        />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full justify-center"
                                isLoading={loading}
                            >
                                Create Doctor & Account
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CreateDoctor;
