/**
 * Zone name for the booking picker.
 * `long` follows the instant (Eastern Daylight Time or Eastern Standard Time).
 * `longGeneric` stays neutral across a daylight-saving change (Eastern Time).
 */
export function zoneLabel(
  timeZone: string,
  date: Date | undefined,
  kind: 'long' | 'longGeneric',
  locale?: string,
): string {
  const sample = date ?? new Date();
  const name = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: kind,
  })
    .formatToParts(sample)
    .find((part) => part.type === 'timeZoneName')?.value;
  const city = timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone;
  return `${name ?? timeZone} (${city})`;
}
