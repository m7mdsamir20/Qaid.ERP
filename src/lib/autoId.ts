export function generateNextCode(lastCode: string | null | undefined, prefix: string, padding: number = 3): string {
    if (!lastCode) {
        return `${prefix}${'1'.padStart(padding, '0')}`;
    }

    // Extract the numeric part of the last code
    const numberPart = lastCode.replace(prefix, '');
    const currentNumber = parseInt(numberPart, 10);

    if (isNaN(currentNumber)) {
        return `${prefix}${'1'.padStart(padding, '0')}`;
    }

    const nextNumber = currentNumber + 1;
    // Pad the number to match the original length or the specified default padding
    const activePadding = Math.max(numberPart.length, padding);

    return `${prefix}${nextNumber.toString().padStart(activePadding, '0')}`;
}
