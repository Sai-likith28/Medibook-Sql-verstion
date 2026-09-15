import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export interface Doctor {
    _id: string;
    name: string;
    specialization: string;
}

export interface Slot {
    _id: string;
    doctorId: string;
    date: string;
    time: string;
    isBooked: boolean;
}

export interface Booking {
    _id: string;
    slotId: string;
    patientName: string;
    status: string;
}

export const getDoctors = async () => {
    const response = await api.get<Doctor[]>('/doctors');
    return response.data;
};

export const getDoctorSlots = async (doctorId: string) => {
    const response = await api.get<Slot[]>(`/doctors/${doctorId}/slots`);
    return response.data;
};

export const bookSlot = async (slotId: string, patientName: string) => {
    const response = await api.post<Booking>('/bookings', { slotId, patientName });
    return response.data;
};

// Admin
export const createDoctor = async (data: { name: string; specialization: string }) => {
    const response = await api.post<Doctor>('/admin/doctors', data);
    return response.data;
};

export const createSlot = async (data: { doctorId: string; date: string; time: string }) => {
    const response = await api.post<Slot>('/admin/slots', data);
    return response.data;
};

export const getAllSlots = async (doctorId?: string) => {
    const url = doctorId ? `/admin/slots?doctorId=${doctorId}` : '/admin/slots';
    const response = await api.get<Slot[]>(url);
    return response.data;
};
