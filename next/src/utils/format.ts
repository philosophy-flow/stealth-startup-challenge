export function formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // Add country code if not present
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
        return `+${cleaned}`;
    }

    // Assume it's already properly formatted
    return phone.startsWith("+") ? phone : `+${phone}`;
}
