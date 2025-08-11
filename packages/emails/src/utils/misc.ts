export const daysRemaining = (end: Date) =>
  Math.round((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
