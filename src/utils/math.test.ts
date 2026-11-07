import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, easeInOutCubic, calculateScrollProgress, lerp, advanceWithSpeedLimit, smoothDampWithSpeedLimit } from './math';

test('clamp restricts values to min and max', () => {
  assert.equal(clamp(-0.5, 0, 1), 0);
  assert.equal(clamp(1.5, 0, 1), 1);
  assert.equal(clamp(0.5, 0, 1), 0.5);
});

test('easeInOutCubic gives expected boundary and symmetry values', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
  // S-curve acceleration check
  assert.ok(easeInOutCubic(0.2) < 0.2);
  assert.ok(easeInOutCubic(0.8) > 0.8);
});

test('calculateScrollProgress computes valid 0-1 range', () => {
  // 2000px track, 1000px viewport => travel = 1000px
  assert.equal(calculateScrollProgress(0, 2000, 1000), 0);
  assert.equal(calculateScrollProgress(500, 2000, 1000), 0.5);
  assert.equal(calculateScrollProgress(1000, 2000, 1000), 1);
  assert.equal(calculateScrollProgress(1500, 2000, 1000), 1);
  assert.equal(calculateScrollProgress(-200, 2000, 1000), 0);
  // Zero travel guard
  assert.equal(calculateScrollProgress(50, 1000, 1000), 0);
});

test('lerp correctly blends values', () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(lerp(10, 20, 0.5), 15);
});

test('advanceWithSpeedLimit strictly caps max progress rate', () => {
  // If target jumps from 0 to 1 in 16ms, at max rate 0.8/sec it moves at most 0.8*0.016 = 0.0128
  const next = advanceWithSpeedLimit(0, 1.0, 0.8, 0.016);
  assert.ok(next <= 0.01281);
  assert.ok(next > 0.012);

  // If already close, snaps directly to target without overshooting
  assert.equal(advanceWithSpeedLimit(0.99, 1.0, 0.8, 0.05), 1.0);
  assert.equal(advanceWithSpeedLimit(0.01, 0.0, 0.8, 0.05), 0.0);

  // Zero delta does not move
  assert.equal(advanceWithSpeedLimit(0.5, 1.0, 0.8, 0), 0.5);
});

test('smoothDampWithSpeedLimit smoothly damps and honors speed limit', () => {
  // On large delta leap, step is clamped to maxRate * delta
  const val = smoothDampWithSpeedLimit(0, 1.0, 8.0, 0.75, 0.016);
  assert.ok(val <= 0.75 * 0.016 + 1e-6);
  assert.ok(val > 0);
});
