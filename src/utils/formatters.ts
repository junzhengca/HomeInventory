/**
 * Date formatting utilities
 */

/**
 * Format location text with optional detailed location
 * @param locationId - Location ID (e.g., "living-room")
 * @param detailedLocation - Optional detailed location string
 * @param t - i18n translation function
 * @returns Formatted location string (e.g., "Living Room • Desk" or "Living Room")
 */
export const formatLocation = (
  locationId: string,
  detailedLocation: string | undefined,
  t: (key: string) => string
): string => {
  const locationText = t(`locations.${locationId}`);
  
  if (!detailedLocation || detailedLocation.trim() === '') {
    return locationText;
  }
  
  return `${locationText} • ${detailedLocation}`;
};

/**
 * Format a date string or Date object for display
 * @param date - Date string (ISO format) or Date object or null/undefined
 * @param locale - Locale string (default: 'zh-CN')
 * @param t - Optional i18n translation function for fallback text
 * @returns Formatted date string or translated fallback text if date is invalid/missing
 */
export const formatDate = (
  date: string | Date | null | undefined,
  locale: string = 'zh-CN',
  t?: (key: string) => string
): string => {
  const notSetText = t ? t('itemDetails.notSet') : '未设置';

  if (!date) return notSetText;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return notSetText;
    }

    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return notSetText;
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
 * @param useWanFormat - Whether to use short format for large numbers (default: false)
 * @param locale - Locale string to determine number format style (default: 'zh-CN')
 * @returns Formatted currency string (e.g., '¥ 1.1w' or '$ 1.1B' depending on locale)
 */
export const formatCurrency = (
  value: number,
  currencySymbol: string,
  useWanFormat: boolean = false,
  locale: string = 'zh-CN'
): string => {
  if (useWanFormat) {
    const isChinese = locale.startsWith('zh');
    
    // Use more aggressive shortening for better fit in small cards
    if (value >= 100000000) {
      // 100 million or more
      if (isChinese) {
        const yi = value / 100000000;
        return `${currencySymbol}${yi.toFixed(1)}亿`;
      } else {
        const b = value / 1000000000;
        return `${currencySymbol}${b.toFixed(1)}B`;
      }
    } else if (value >= 1000000) {
      // 1 million or more
      if (isChinese) {
        const wan = value / 10000;
        if (wan >= 100) {
          return `${currencySymbol}${wan.toFixed(0)}w`;
        } else if (wan >= 10) {
          return `${currencySymbol}${wan.toFixed(1)}w`;
        } else {
          return `${currencySymbol}${wan.toFixed(1)}w`;
        }
      } else {
        const m = value / 1000000;
        return `${currencySymbol}${m.toFixed(1)}M`;
      }
    } else if (value >= 10000) {
      // 10,000 or more
      if (isChinese) {
        const wan = value / 10000;
        return `${currencySymbol}${wan.toFixed(1)}w`;
      } else {
        const k = value / 1000;
        return `${currencySymbol}${k.toFixed(1)}K`;
      }
    } else if (value >= 1000) {
      // 1,000 or more: use "k" format for compactness
      const k = value / 1000;
      if (isChinese) {
        return `${currencySymbol}${k.toFixed(1)}k`;
      } else {
        return `${currencySymbol}${k.toFixed(1)}K`;
      }
    }
  }
  // For smaller numbers, use regular formatting but limit decimal places
  if (value >= 1000) {
    return `${currencySymbol} ${Math.round(value).toLocaleString()}`;
  }
  return `${currencySymbol} ${value.toLocaleString()}`;
};

