export function debounce(callback:Function, delay:number) {
    let timeout = null;
    return (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), delay);
    };
}