export function debounce(callback, delay) {
    let timeout = null;
    return function(...args) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), delay);
    };
}