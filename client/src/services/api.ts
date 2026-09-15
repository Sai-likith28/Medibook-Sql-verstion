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

// SQL Reports Types & API
export interface DoctorUtilizationReport {
    doctor_id: number;
    doctor_name: string;
    specialization: string;
    total_slots: number;
    confirmed_bookings: number;
    failed_bookings: number;
    available_slots: number | string;
    utilization_rate_pct: number | string | null;
}

export interface DailySummaryReport {
    appointment_date: string;
    total_slots: number;
    confirmed_bookings: number;
    failed_bookings: number;
    pending_bookings: number;
    confirmation_rate_pct: number | string | null;
}

export interface PatientActivityReport {
    patient_id: number;
    patient_name: string;
    total_booking_attempts: number;
    confirmed_appointments: number | string;
    failed_appointments: number | string;
    last_booking_date: string;
}

export interface PeakBookingTimeReport {
    time_window: string;
    slot_hour: string;
    total_slots_offered: number;
    total_booked_slots: number | string;
    booking_fill_rate_pct: number | string | null;
}

export interface SpecializationDemandReport {
    specialization: string;
    doctor_count: number;
    total_department_slots: number;
    confirmed_bookings: number;
    failed_bookings: number;
    department_fill_rate_pct: number | string | null;
}

export interface BookingAuditLifecycleReport {
    audit_action: string;
    previous_status: string;
    new_status: string;
    total_events: number;
    pct_of_total_events: number | string | null;
}

export interface ReportResponse<T> {
    report: string;
    data: T[];
}

export type ValidReportName =
    | 'doctor-utilization'
    | 'daily-summary'
    | 'patient-activity'
    | 'peak-booking-time'
    | 'specialization-demand'
    | 'booking-audit-lifecycle';

export const getReport = async <T>(reportName: ValidReportName): Promise<T[]> => {
    const response = await api.get<ReportResponse<T>>(`/admin/reports/${reportName}`);
    return response.data.data;
};
