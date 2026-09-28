/** The one place an email is turned into the form stored in `users.email`.
 *  Case and surrounding spaces must never create two accounts that cannot both
 *  be logged into, and lookups have to use the same shape. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
