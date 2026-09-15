/**
 * Utility functions for formatting booking references, dates, times, and statuses.
 */

/**
 * Format numeric ID or raw string into standard presentation booking reference: BK-000001
 */
export const formatBookingRef = (id: number | string | undefined | null): string => {
    if (id === undefined || id === null || id === '') return 'BK-000000';
    const str = String(id).trim();
    if (str.toUpperCase().startsWith('BK-')) {
        const numPart = str.substring(3);
        const parsed = parseInt(numPart, 10);
        return isNaN(parsed) ? str : `BK-${String(parsed).padStart(6, '0')}`;
    }
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? `BK-${str}` : `BK-${String(parsed).padStart(6, '0')}`;
};

/**
 * Format appointment ISO date string (e.g. "2026-11-19") into "19 Nov 2026".
 * Timezone safe parsing for YYYY-MM-DD strings.
 */
export const formatAppointmentDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return 'N/A';
    const trimmed = String(dateStr).trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        const localDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        return localDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const parsedDate = new Date(trimmed);
    if (isNaN(parsedDate.getTime())) return trimmed;
    return parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Format 24-hour appointment time string (e.g. "09:30" or "14:00") into "09:30 AM" or "02:00 PM".
 * Timezone safe string manipulation.
 */
export const formatAppointmentTime = (timeStr: string | undefined | null): string => {
    if (!timeStr) return 'N/A';
    const trimmed = String(timeStr).trim();
    if (/am|pm/i.test(trimmed)) return trimmed; // Already has AM/PM
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) return trimmed;
    let hh = parseInt(timeMatch[1], 10);
    const mm = timeMatch[2];
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    const formattedHH = String(hh).padStart(2, '0');
    return `${formattedHH}:${mm} ${ampm}`;
};

/**
 * Format raw ISO timestamp into clean date-time string (e.g. "15 Sep 2026, 11:57 AM")
 */
export const formatDateTime = (isoStr: string | undefined | null): string => {
    if (!isoStr) return 'N/A';
    const parsedDate = new Date(isoStr);
    if (isNaN(parsedDate.getTime())) return String(isoStr);
    const datePart = parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timePart = parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart}, ${timePart}`;
};

/**
 * Format booking timestamp with "Booked on" prefix (e.g. "Booked on 15 Sep 2026, 11:57 AM")
 */
export const formatBookingTimestamp = (isoStr: string | undefined | null): string => {
    const formatted = formatDateTime(isoStr);
    if (formatted === 'N/A') return 'N/A';
    return `Booked on ${formatted}`;
};

export interface StatusBadgeInfo {
    label: string;
    badgeClass: string;
    iconClass: string;
}

/**
 * Get standardized UI status badge formatting for PENDING, CONFIRMED, FAILED
 */
export const getStatusBadgeStyle = (status: string | undefined | null): StatusBadgeInfo => {
    const upper = (status || '').toUpperCase().trim();
    switch (upper) {
        case 'CONFIRMED':
            return {
                label: 'Confirmed',
                badgeClass: 'bg-green-100 text-green-800 border-green-200',
                iconClass: 'text-green-600'
            };
        case 'PENDING':
            return {
                label: 'Pending',
                badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                iconClass: 'text-yellow-600'
            };
        case 'FAILED':
        default:
            return {
                label: upper === 'FAILED' ? 'Failed' : upper || 'Failed',
                badgeClass: 'bg-red-100 text-red-800 border-red-200',
                iconClass: 'text-red-600'
            };
    }
};
