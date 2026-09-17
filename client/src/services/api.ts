import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('medibook_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface Doctor {
    _id: string;
    name: string;
    specialization: string;
    doctorCode?: string;
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
    id?: number;
    slotId: string | Slot;
    patientName: string;
    doctorName?: string;
    specialization?: string;
    status: string;
    expiresAt?: string | null;
    createdAt?: string;
}

export interface TestCatalogItem {
    id: number;
    testCode: string;
    name: string;
    category: string;
    description?: string;
}

export interface TestResultItem {
    id: number;
    value: string;
    notes?: string;
    performedAt?: string;
}

export interface AppointmentTestItem {
    id: number;
    bookingId: number;
    testId: number;
    testCode: string;
    name: string;
    category: string;
    description?: string;
    instructions?: string;
    status: string;
    createdAt?: string;
    doctorName?: string;
    slotDate?: string;
    result?: TestResultItem | null;
}

export interface PatientAppointment {
    _id: string;
    id: number;
    bookingRef: string;
    patientId: number;
    patientName: string;
    patientCode?: string;
    doctorId: string;
    doctorName: string;
    doctorCode?: string;
    specialization: string;
    status: string;
    expiresAt?: string | null;
    createdAt: string;
    date: string;
    time: string;
    slotId: string;
    tests?: AppointmentTestItem[];
}

export interface DoctorAppointment {
    _id: string;
    id: number;
    bookingRef: string;
    patientId: number;
    patientName: string;
    patientCode?: string;
    doctorId: string;
    doctorName: string;
    doctorCode?: string;
    specialization: string;
    status: string;
    expiresAt?: string | null;
    createdAt: string;
    date: string;
    time: string;
    slotId: string;
    tests?: AppointmentTestItem[];
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

export const getBookingById = async (bookingId: string) => {
    const response = await api.get<Booking>(`/bookings/${bookingId}`);
    return response.data;
};

// Patient Portal APIs
export const getMyAppointments = async () => {
    const response = await api.get<PatientAppointment[]>('/patients/me/appointments');
    return response.data;
};

export const getMyAppointmentById = async (id: string) => {
    const response = await api.get<PatientAppointment>(`/patients/me/appointments/${id}`);
    return response.data;
};

// Doctor Portal APIs
export const getDoctorAppointments = async () => {
    const response = await api.get<DoctorAppointment[]>('/doctor/appointments');
    return response.data;
};

export const getDoctorAppointmentById = async (id: string) => {
    const response = await api.get<DoctorAppointment>(`/doctor/appointments/${id}`);
    return response.data;
};

// Clinical Tests APIs
export const getTestCatalog = async () => {
    const response = await api.get<TestCatalogItem[]>('/doctor/tests');
    return response.data;
};

export const suggestTest = async (appointmentId: number | string, testId: number, instructions?: string) => {
    const response = await api.post<AppointmentTestItem>(`/doctor/appointments/${appointmentId}/tests`, {
        testId,
        instructions
    });
    return response.data;
};

export const removeTest = async (appointmentId: number | string, testId: number) => {
    const response = await api.delete<{ message: string }>(`/doctor/appointments/${appointmentId}/tests/${testId}`);
    return response.data;
};

export const getPatientTests = async () => {
    const response = await api.get<AppointmentTestItem[]>('/patients/me/tests');
    return response.data;
};

export const getAppointmentTests = async (appointmentId: number | string) => {
    const response = await api.get<AppointmentTestItem[]>(`/doctor/appointments/${appointmentId}/tests`);
    return response.data;
};

// Admin
export interface CreateDoctorPayload {
    name: string;
    specialization: string;
    email?: string;
    password?: string;
}

export interface CreateDoctorResponse extends Doctor {
    doctorCode: string;
    loginId: string;
    tempPassword?: string;
    message?: string;
}

export interface RegisterPatientPayload {
    name: string;
    loginId: string;
    password: string;
    email?: string;
    phone?: string;
}

export const registerPatient = async (data: RegisterPatientPayload) => {
    const response = await api.post<{ token: string; user: any }>('/auth/register', data);
    return response.data;
};

export const createDoctor = async (data: CreateDoctorPayload) => {
    const response = await api.post<CreateDoctorResponse>('/admin/doctors', data);
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
