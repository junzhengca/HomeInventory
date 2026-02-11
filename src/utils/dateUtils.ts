/**
 * Date manipulation and calculation utilities
 */

/**
 * Check if an item is expiring within a specified number of days
 * @param expiryDate - Expiry date string (ISO format) or Date object
 * @param days - Number of days to check ahead (default: 7)
 * @returns True if item expires within the specified days, false otherwise
 */
export const isExpiringSoon = (
  expiryDate: string | Date | null | undefined,
  days: number = 7
): boolean => {
  if (!expiryDate) return false;

  try {
    const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Check if expiry date is valid
    if (isNaN(expiry.getTime())) {
      return false;
    }

    // Item is expiring soon if expiry date is between now and futureDate
    return expiry <= futureDate && expiry >= now;
  } catch {
    return false;
  }
};

/**
 * Count items that are expiring within a specified number of days
 * Uses earliest expiry date from item batches.
 * @param items - Array of items with batches containing optional expiryDate
 * @param days - Number of days to check ahead (default: 7)
 * @returns Number of items expiring soon
 */
export const countExpiringItems = <T extends { batches?: Array<{ expiryDate?: string | null }> }>(
  items: T[],
  days: number = 7
): number => {
  return items.filter((item) => {
    if (!item.batches || item.batches.length === 0) return false;
    const expiryDates = item.batches
      .filter((b) => b.expiryDate)
      .map((b) => b.expiryDate!)
      .sort();
    return expiryDates.length > 0 && isExpiringSoon(expiryDates[0], days);
  }).length;
};


