// /lib/time.ts

/**
 * Parse server ISO date string (with timezone)
 * Automatically converted to browser local time.
 */
export function parseServerDate(dateString?: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Format date as local browser time (absolute).
 * Used for tooltip / hover.
 */
export function formatLocalDateTime(dateString?: string): string {
    const date = parseServerDate(dateString);
    if (!date) return '-';

    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
    }).format(date);
}

/**
 * Format relative time in the browser's locale (e.g. 5 minutes ago, tomorrow).
 * Handles future timestamps as well as past timestamps.
 */
export function formatRelativeTime(dateString?: string): string {
    const date = parseServerDate(dateString);
    if (!date) return '-';

    const diffSeconds = (date.getTime() - Date.now()) / 1000;
    const absSeconds = Math.abs(diffSeconds);
    if (absSeconds < 5) return 'just now';

    let value: number;
    let unit: Intl.RelativeTimeFormatUnit;

    if (absSeconds < 60) {
        value = Math.round(diffSeconds);
        unit = 'second';
    } else if (absSeconds < 60 * 60) {
        value = Math.round(diffSeconds / 60);
        unit = 'minute';
    } else if (absSeconds < 24 * 60 * 60) {
        value = Math.round(diffSeconds / (60 * 60));
        unit = 'hour';
    } else if (absSeconds < 30 * 24 * 60 * 60) {
        value = Math.round(diffSeconds / (24 * 60 * 60));
        unit = 'day';
    } else if (absSeconds < 365 * 24 * 60 * 60) {
        value = Math.round(diffSeconds / (30 * 24 * 60 * 60));
        unit = 'month';
    } else {
        value = Math.round(diffSeconds / (365 * 24 * 60 * 60));
        unit = 'year';
    }

    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(value, unit);
}

export function formatTimeDifference(startDateString?: string, endDateString?: string): string {
    const startDate = parseServerDate(startDateString);
    if (!startDate) return '-';
    const endDate = parseServerDate(endDateString);
    if (!endDate) return '-';

    // Calculate the time difference in milliseconds and take the absolute value
    const diffInMs: number = Math.abs(endDate.getTime() - startDate.getTime());

    // Convert milliseconds to total seconds
    const totalSeconds: number = Math.floor(diffInMs / 1000);

    // Calculate minutes and remaining seconds
    const minutes: number = Math.floor(totalSeconds / 60);
    const seconds: number = totalSeconds % 60;

    // Pad minutes and seconds with leading zeros if they are less than 10
    const formattedMinutes: string = minutes.toString().padStart(2, '0');
    const formattedSeconds: string = seconds.toString().padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

export const getStandardizedTimestamp = () => {
    const now = new Date();

    const pad = (num: number, size = 2) =>
        String(num).padStart(size, "0");

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    // JS only has milliseconds (3 digits)
    const milliseconds = pad(now.getMilliseconds(), 3);

    // Convert to nanoseconds (pad to 9 digits)
    const nanoseconds = milliseconds.padEnd(9, "0");

    const offsetMinutes = -now.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? "+" : "-";
    const offsetHours = pad(
        Math.floor(Math.abs(offsetMinutes) / 60)
    );
    const offsetMins = pad(
        Math.abs(offsetMinutes) % 60
    );

    const offset = `${offsetSign}${offsetHours}:${offsetMins}`;

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${nanoseconds}${offset}`;
};