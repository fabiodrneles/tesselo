// Tesselo — time.ts
// Shared time formatting utilities.

/** Formats a number of seconds as MM:SS (e.g. 75 → "01:15"). */
export function formatTime(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
