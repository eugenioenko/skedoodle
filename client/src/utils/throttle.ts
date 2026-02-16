/**
 * Creates a throttled version of the given function that will only execute
 * at most once in the specified limit of time.
 *
 * @param func - The function to throttle.
 * @param limit - The time limit in milliseconds to throttle the function.
 * @returns A throttled version of the given function.
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    // Check if the function can be called immediately
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    } else {
      // Clear the existing timer if it exists
      if (timer) {
        clearTimeout(timer);
      }
      // Set a new timer to call the function after the remaining time
      timer = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, limit - (now - lastCall));
    }
  };
}
