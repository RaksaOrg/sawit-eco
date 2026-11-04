export function logServerError(...values: unknown[]) {
  if (process.env.NODE_ENV !== 'production') console.error(...values);
}
