export function formatDeadline(value: number | string | undefined): string {
  if (!value) return 'Sin fecha';

  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 8) return String(value);

  const day = digits.slice(6, 8);
  const month = digits.slice(4, 6);
  const hour = digits.length >= 10 ? digits.slice(8, 10) : '00';
  const minute = digits.length >= 12 ? digits.slice(10, 12) : '00';
  return `${day}/${month} ${hour}:${minute}`;
}

export function formatDuration(minutes: number | undefined): string {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

export function parseDeadlineInput(value: string, fallbackYear = new Date().getFullYear()): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const digits = trimmed.replace(/\D/g, '');
  if (/^\d{14}$/.test(digits)) return Number(digits);
  if (/^\d{12}$/.test(digits)) return Number(`${digits}00`);
  if (/^\d{8}$/.test(digits)) return Number(`${digits}000000`);

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) return 0;

  const [, day, month, hour = '00', minute = '00'] = match;
  return Number(
    `${fallbackYear}${month.padStart(2, '0')}${day.padStart(2, '0')}${hour.padStart(2, '0')}${minute}00`,
  );
}

export function deadlineYear(value: number | undefined): number {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? Number(digits.slice(0, 4)) : new Date().getFullYear();
}
