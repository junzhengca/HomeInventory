/**
 * Utility functions for computing aggregate values from item batches.
 */

import type { ItemBatch } from '../types/inventory';

/**
 * Get total amount across all batches
 */
export const getTotalAmount = (batches: ItemBatch[]): number => {
    return batches.reduce((sum, b) => sum + b.amount, 0);
};

/**
 * Get total value (sum of prices) across all batches
 */
export const getTotalValue = (batches: ItemBatch[]): number => {
    return batches.reduce((sum, b) => sum + (b.price ?? 0), 0);
};

/**
 * Get the earliest expiry date across all batches
 * Returns undefined if no batches have an expiry date
 */
export const getEarliestExpiry = (batches: ItemBatch[]): string | undefined => {
    const expiryDates = batches
        .filter((b) => b.expiryDate)
        .map((b) => b.expiryDate!)
        .sort();
    return expiryDates.length > 0 ? expiryDates[0] : undefined;
};

/**
 * Get the latest purchase date across all batches
 * Returns undefined if no batches have a purchase date
 */
export const getLatestPurchase = (batches: ItemBatch[]): string | undefined => {
    const purchaseDates = batches
        .filter((b) => b.purchaseDate)
        .map((b) => b.purchaseDate!)
        .sort()
        .reverse();
    return purchaseDates.length > 0 ? purchaseDates[0] : undefined;
};
