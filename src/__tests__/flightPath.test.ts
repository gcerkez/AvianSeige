import { describe, it, expect } from 'vitest';
import {
  createDefaultFlightPath,
  getFlightPathLength,
  advanceFlightPath,
} from '../utils/flightPath';

describe('Aerial Patrol & Flight Path Loop System', () => {
  it('creates a 4-point closed loop patrol path around anchor point', () => {
    const path = createDefaultFlightPath(300, 200, 60);
    expect(path.length).toBe(4);
    // Bounds check
    path.forEach((wp) => {
      expect(wp.x).toBeGreaterThanOrEqual(80);
      expect(wp.x).toBeLessThanOrEqual(820);
      expect(wp.y).toBeGreaterThanOrEqual(80);
      expect(wp.y).toBeLessThanOrEqual(470);
    });
  });

  it('calculates total loop perimeter length accurately', () => {
    // 100 x 50 rectangle
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];
    const length = getFlightPathLength(rect);
    expect(length).toBe(300); // 100 + 50 + 100 + 50
  });

  it('smoothly advances aircraft along loop with correct orientation angle', () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];

    // Move along first segment (0,0) -> (100,0) with speed 50 for 1 second
    const step1 = advanceFlightPath(rect, 0, 50, 1.0);
    expect(step1.x).toBe(50);
    expect(step1.y).toBe(0);
    expect(step1.rotation).toBeCloseTo(0, 4); // heading east
    expect(step1.newProgressDistance).toBe(50);

    // Advance further around the corner onto downward segment (100,0) -> (100,50)
    const step2 = advanceFlightPath(rect, step1.newProgressDistance, 75, 1.0); // total 125 distance -> 25 along 2nd segment
    expect(step2.x).toBe(100);
    expect(step2.y).toBe(25);
    expect(step2.rotation).toBeCloseTo(Math.PI / 2, 4); // heading south
  });

  it('wraps around seamlessly upon completing full circuit', () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];
    const totalLength = 300;

    // Moving 350 distance should wrap to 50 on first segment
    const wrapStep = advanceFlightPath(rect, 0, 350, 1.0);
    expect(wrapStep.newProgressDistance).toBe(50);
    expect(wrapStep.x).toBe(50);
    expect(wrapStep.y).toBe(0);
  });
});
