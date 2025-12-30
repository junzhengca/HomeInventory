/**
 * Date formatting utilities
 */

/**
 * Format a date string or Date object for display
 * @param date - Date string (ISO format) or Date object or null/undefined
 * @param locale - Locale string (default: 'zh-CN')
 * @returns Formatted date string or '未设置' if date is invalid/missing
 */
export const formatDate = (
  date: string | Date | null | undefined,
  locale: string = 'zh-CN'
): string => {
  if (!date) return '未设置';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '未设置';
    }
    
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '未设置';
  }
};

/**
 * Format a price value with currency symbol
 * @param price - Price value as number
 * @param currencySymbol - Currency symbol (e.g., '¥', '$')
 * @returns Formatted price string (e.g., '¥ 1,000')
 */
export const formatPrice = (price: number, currencySymbol: string): string => {
  return `${currencySymbol} ${price.toLocaleString()}`;
};

/**
 * Format a currency value with special handling for large numbers
 * @param value - Currency value as number
 * @param currencySymbol - Currency symbol (e.g., '¥', '$')
 * @param useWanFormat - Whether to use 'w' format for values >= 10000 (default: false)
 * @returns Formatted currency string (e.g., '¥ 1.1w' or '¥ 5,000')
 */
export const formatCurrency = (
  value: number,
  currencySymbol: string,
  useWanFormat: boolean = false
): string => {
  if (useWanFormat) {
    // Use more aggressive shortening for better fit in small cards
    if (value >= 100000000) {
      // 100 million or more: use "亿" (yi) format
      const yi = value / 100000000;
      return `${currencySymbol}${yi.toFixed(1)}亿`;
    } else if (value >= 10000) {
      // 10,000 or more: use "w" (wan) format
      const wan = value / 10000;
      // Use fewer decimal places for larger numbers to save space
      if (wan >= 100) {
        return `${currencySymbol}${wan.toFixed(0)}w`;
      } else if (wan >= 10) {
        return `${currencySymbol}${wan.toFixed(1)}w`;
      } else {
        return `${currencySymbol}${wan.toFixed(1)}w`;
      }
    } else if (value >= 1000) {
      // 1,000 or more: use "k" format for compactness
      const k = value / 1000;
      return `${currencySymbol}${k.toFixed(1)}k`;
    }
  }
  // For smaller numbers, use regular formatting but limit decimal places
  if (value >= 1000) {
    return `${currencySymbol} ${Math.round(value).toLocaleString()}`;
  }
  return `${currencySymbol} ${value.toLocaleString()}`;
};

