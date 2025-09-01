import moment from 'moment';

export function formatDuration(start: moment.Moment, end: moment.Moment): string {
  const duration = moment.duration(end.diff(start));
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  const parts: string[] = [];
  parts.push(`${`${hours}`.padStart(2, '0')}:`);
  parts.push(`${`${minutes}`.padStart(2, '0')}:`);
  parts.push(`${`${seconds}`.padStart(2, '0')}`);
  if (parts.length === 0) return '00:00';
  return parts.join('');
}

export function parseDurationToSeconds(durationStr: string): number {
  let totalSeconds = 0;
  const hoursMatch = durationStr.match(/(\d+)\s*h/);
  const minutesMatch = durationStr.match(/(\d+)\s*m/);
  const secondsMatch = durationStr.match(/(\d+)\s*s/);
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
  if (!hoursMatch && !minutesMatch && !secondsMatch && !isNaN(parseInt(durationStr))) {
    return parseInt(durationStr);
  }
  return totalSeconds;
}

export function formatSecondsToDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (parts.length === 0) return '0s';
  return parts.join(' ');
}

export function formatTotalSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0h 0m';
  const duration = moment.duration(totalSeconds, 'seconds');
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  return `${hours}h ${minutes}m`;
}
