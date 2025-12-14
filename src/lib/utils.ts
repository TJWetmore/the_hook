export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
};

export const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', DATE_OPTIONS);
};
