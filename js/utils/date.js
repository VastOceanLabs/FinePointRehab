/**
 * Date Utilities for FinePointRehab
 * 
 * UTC-safe date normalization to prevent timezone drift 
 * causing streak logic off-by-one errors.
 * 
 * Critical for streak system where exact day differences are required:
 * - 1 = consecutive day (increment streak)  
 * - 0 = same day (maintain streak)
 * - >1 = gap (reset streak or check Monday amnesty)
 */

// Constants
const MS_PER_DAY = 86_400_000; // 24 * 60 * 60 * 1000ms

/**
 * Guard to ensure a Date is valid
 * @param {Date} d - Date object to validate
 * @param {string} context - Context for error message
 * @throws {Error} If date is invalid
 */
function assertValidDate(d, context = 'date') {
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    throw new Error(`Invalid ${context}: ${String(d)}`);
  }
}

/**
 * Convert any date-like input to UTC-normalized YYYY-MM-DD string
 * Prevents timezone drift that causes off-by-one errors in streak logic
 * 
 * @param {Date|string|number} dateLike - Date input to normalize
 * @returns {string} UTC-normalized date string in YYYY-MM-DD format
 * @throws {Error} If input cannot be parsed as a valid date
 */
export function toYMD(dateLike) {
  const d = (dateLike instanceof Date) ? dateLike : new Date(dateLike);
  assertValidDate(d, 'dateLike');
  
  // Force UTC-safe Y-M-D to avoid TZ drift
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  
  return `${y}-${m}-${day}`;
}

/**
 * Calculate exact day difference between two YYYY-MM-DD strings
 * Uses UTC interpretation to ensure consistent day counting regardless of timezone
 * 
 * @param {string} ymdA - First date string (YYYY-MM-DD)
 * @param {string} ymdB - Second date string (YYYY-MM-DD)  
 * @returns {number} Exact days difference (positive if ymdB is after ymdA, negative if before)
 * @throws {Error} If either date string cannot be parsed as a valid date
 */
export function dayDiff(ymdA, ymdB) {
  // Parse as UTC to avoid timezone interpretation issues
  const a = new Date(`${ymdA}T00:00:00.000Z`);
  const b = new Date(`${ymdB}T00:00:00.000Z`);
  assertValidDate(a, 'ymdA');
  assertValidDate(b, 'ymdB');
  
  // Return exact days difference
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/**
 * Get current date as UTC-normalized YYYY-MM-DD string
 * Convenience function for consistent "today" representation
 * 
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function today() {
  return toYMD(new Date());
}

/**
 * Check if a YYYY-MM-DD string represents yesterday relative to another date
 * Useful for streak logic validation
 * 
 * @param {string} checkDate - Date string to check (YYYY-MM-DD)
 * @param {string} [referenceDate] - Reference date (defaults to today)
 * @returns {boolean} True if checkDate is exactly 1 day before referenceDate
 * @throws {Error} If either date string cannot be parsed as a valid date
 */
export function isYesterday(checkDate, referenceDate = today()) {
  return dayDiff(checkDate, referenceDate) === 1;
}

/**
 * Check if a YYYY-MM-DD string represents today
 * 
 * @param {string} checkDate - Date string to check (YYYY-MM-DD)
 * @returns {boolean} True if checkDate is today
 * @throws {Error} If checkDate cannot be parsed as a valid date
 */
export function isToday(checkDate) {
  return checkDate === today();
}

/**
 * Add days to a YYYY-MM-DD string and return new YYYY-MM-DD string
 * Useful for date arithmetic in tests and streak calculations
 * 
 * @param {string} ymd - Base date string (YYYY-MM-DD)
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} New date string in YYYY-MM-DD format
 * @throws {Error} If ymd cannot be parsed as a valid date
 */
export function addDays(ymd, days) {
  const base = new Date(`${ymd}T00:00:00.000Z`);
  assertValidDate(base, 'ymd');
  const newTime = base.getTime() + days * MS_PER_DAY;
  return toYMD(new Date(newTime));
}