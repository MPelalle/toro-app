/**
 * TORO organiza planes diarios con el calendario argentino. Las fechas de
 * calendario se almacenan al mediodía UTC para que no cambien de día al
 * serializarse desde clientes de distintos husos horarios.
 */
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

function formatPart(value: Date | string, type: Intl.DateTimeFormatPartTypes) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value)).find((part) => part.type === type)?.value || "";
}

/** Returns the current calendar day in TORO's product timezone. */
export function appDateKey(value: Date | string = new Date()) {
  return `${formatPart(value, "year")}-${formatPart(value, "month")}-${formatPart(value, "day")}`;
}

/** Returns the literal day stored in a date-only database field. */
export function storedDateKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Converts a YYYY-MM-DD calendar key to its stable database representation. */
export function dateAtNoonUTC(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

/** Normalizes an instant to a midday date object for weekday/week arithmetic. */
export function appCalendarDate(value: Date | string = new Date()) {
  return dateAtNoonUTC(appDateKey(value));
}
