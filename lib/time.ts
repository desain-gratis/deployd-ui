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

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

/**
 * Format relative time (e.g. 5m ago, 2h ago)
 */
export function formatRelativeTime(dateString?: string): string {
    const date = parseServerDate(dateString);
    if (!date) return '-';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}d ago`;

    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo ago`;

    const diffYear = Math.floor(diffMonth / 12);
    return `${diffYear}y ago`;
}