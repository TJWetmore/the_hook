export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
};

export const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', DATE_OPTIONS);
};
