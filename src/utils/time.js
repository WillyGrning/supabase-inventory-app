export function isExpired(date) {
  return new Date(date).getTime() < Date.now();
}

export function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}