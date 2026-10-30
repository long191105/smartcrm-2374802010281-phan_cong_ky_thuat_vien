const VIETNAM_OFFSET_MINUTES = 7 * 60;
const MINUTE_IN_MILLISECONDS = 60_000;

export function fromVietnamDateTimeLocalValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const wallTime = Date.UTC(year, month - 1, day, hour, minute);
  const calendar = new Date(wallTime);
  if (
    calendar.getUTCFullYear() !== year
    || calendar.getUTCMonth() !== month - 1
    || calendar.getUTCDate() !== day
    || calendar.getUTCHours() !== hour
    || calendar.getUTCMinutes() !== minute
  ) return null;

  return new Date(wallTime - VIETNAM_OFFSET_MINUTES * MINUTE_IN_MILLISECONDS);
}

export function toVietnamDateTimeLocalValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + VIETNAM_OFFSET_MINUTES * MINUTE_IN_MILLISECONDS)
    .toISOString()
    .slice(0, 16);
}

export function addMinutesToVietnamDateTimeLocalValue(value, minutes) {
  const date = fromVietnamDateTimeLocalValue(value);
  if (!date || !Number.isInteger(minutes)) return '';
  return toVietnamDateTimeLocalValue(new Date(date.getTime() + minutes * MINUTE_IN_MILLISECONDS));
}

export function defaultVietnamDateTimeLocalValue(now = new Date()) {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MINUTES * MINUTE_IN_MILLISECONDS);
  vietnamNow.setUTCMinutes(Math.ceil((vietnamNow.getUTCMinutes() + 15) / 15) * 15, 0, 0);
  return vietnamNow.toISOString().slice(0, 16);
}
