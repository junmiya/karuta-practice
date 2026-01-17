/**
 * High-precision timer using performance.now()
 * Provides millisecond accuracy for karuta timing
 */
export class PrecisionTimer {
  private startTime: number = 0;

  /**
   * Start the timer
   */
  start(): void {
    this.startTime = performance.now();
  }

  /**
   * Get elapsed time in milliseconds (rounded to integer)
   */
  getElapsedMs(): number {
    if (this.startTime === 0) {
      throw new Error('Timer not started');
    }
    return Math.round(performance.now() - this.startTime);
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = 0;
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.startTime !== 0;
  }
}
