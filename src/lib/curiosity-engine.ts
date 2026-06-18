export interface TaskResult {
  success: boolean;
  durationMs?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export function checkBreaker(context: any) {
  // dummy
  return { isTripped: false };
}

export function scoreTask(result: TaskResult): number {
  if (!result.success) {
    return 0;
  }

  let score = 50;

  // Faster execution gets slightly higher score
  if (result.durationMs !== undefined && result.durationMs < 1000) {
    score += 10;
  }

  return score;
}
