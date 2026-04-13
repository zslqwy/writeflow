export function getLocalDateKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
    return new Date(`${dateKey}T00:00:00`);
}

export function addLocalDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

export function startOfLocalDay(date = new Date()): Date {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
}
