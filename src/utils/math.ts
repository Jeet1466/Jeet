/**
 * Pure math and scroll interpolation helpers
 */

export function clamp(val: number, min: number = 0, max: number = 1): number {
  return Math.min(max, Math.max(min, val));
}

export function easeInOutCubic(x: number): number {
  const clamped = clamp(x, 0, 1);
  return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function calculateScrollProgress(
  scrolledDistance: number,
  trackHeight: number,
  viewportHeight: number
): number {
  const travel = trackHeight - viewportHeight;
  if (travel <= 0) return 0;
  return clamp(scrolledDistance / travel, 0, 1);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Advances current value towards target at a capped maximum rate per second.
 * Guarantees that even if target jumps to 1.0, current never advances faster than maxRatePerSecond.
 */
export function advanceWithSpeedLimit(
  current: number,
  target: number,
  maxRatePerSecond: number,
  deltaSeconds: number
): number {
  if (current === target || deltaSeconds <= 0) return current;
  const maxStep = Math.max(0, maxRatePerSecond * deltaSeconds);
  const diff = target - current;
  if (Math.abs(diff) <= maxStep) {
    return target;
  }
  return current + Math.sign(diff) * maxStep;
}

/**
 * Combines spring/exponential damping with a strict maximum speed limit.
 * Yields natural ease when near target, but strictly caps maximum velocity.
 */
export function smoothDampWithSpeedLimit(
  current: number,
  target: number,
  smoothFactor: number,
  maxRatePerSecond: number,
  deltaSeconds: number
): number {
  if (deltaSeconds <= 0) return current;
  const naturalStep = (target - current) * (1 - Math.exp(-smoothFactor * deltaSeconds));
  const maxStep = maxRatePerSecond * deltaSeconds;
  if (Math.abs(naturalStep) > maxStep) {
    return current + Math.sign(naturalStep) * maxStep;
  }
  return current + naturalStep;
}
