import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

/**
 * Converts a local time string and timezone to a UTC timestamp.
 * @param {string} localTimeStr - e.g. "2026-06-10T07:00"
 * @param {string} userTimezone - e.g. "America/New_York"
 * @returns {number} UTC timestamp in milliseconds
 */
export function localToUTC(localTimeStr, userTimezone) {
  // fromZonedTime gets the UTC date from a zoned date time
  const utcDate = fromZonedTime(localTimeStr, userTimezone);
  return utcDate.getTime();
}

/**
 * Converts a UTC timestamp to a local display time string.
 * @param {number} utcTimestamp - UTC timestamp in milliseconds
 * @param {string} userTimezone - e.g. "America/New_York"
 * @param {string} displayFormat - e.g. 'HH:mm'
 * @returns {string} Formatted local time string
 */
export function utcToLocal(utcTimestamp, userTimezone, displayFormat = 'HH:mm') {
  const utcDate = new Date(utcTimestamp);
  const localDate = toZonedTime(utcDate, userTimezone);
  return format(localDate, displayFormat, { timeZone: userTimezone });
}

/**
 * Gets the device's current timezone.
 * @returns {string} e.g. "America/New_York"
 */
export function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
