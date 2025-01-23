export function validateURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function validateSocialLink(link: string): boolean {
    return validateURL(link);
}