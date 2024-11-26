export function debounce<T extends (...args: any[]) => any>(callback: T, delay: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>): void => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), delay);
    };
}
