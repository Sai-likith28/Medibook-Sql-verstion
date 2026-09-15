import React from 'react';
import type { Doctor } from '../services/api';
import { User } from 'lucide-react';
import Button from './Button';
import { useNavigate } from 'react-router-dom';

interface DoctorCardProps {
    doctor: Doctor;
}

const DoctorCard = ({ doctor }: DoctorCardProps) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                        <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-lg font-medium text-gray-900 truncate">
                            {doctor.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                            {doctor.specialization}
                        </p>
                    </div>
                </div>
                <div className="mt-5">
                    <Button
                        onClick={() => navigate(`/doctor/${doctor._id}`)}
                        className="w-full"
                        variant="secondary"
                    >
                        View Available Slots
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DoctorCard;
