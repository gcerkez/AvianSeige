export interface Waypoint {
  x: number;
  y: number;
}

/**
 * Creates a default patrol route (4-point loop) around an anchor placement point
 */
export function createDefaultFlightPath(centerX: number, centerY: number, radius = 65): Waypoint[] {
  const clampedX = Math.max(80, Math.min(820, centerX));
  const clampedY = Math.max(80, Math.min(470, centerY));

  return [
    { x: Math.round(clampedX - radius), y: Math.round(clampedY - radius * 0.6) },
    { x: Math.round(clampedX + radius), y: Math.round(clampedY - radius * 0.6) },
    { x: Math.round(clampedX + radius), y: Math.round(clampedY + radius * 0.6) },
    { x: Math.round(clampedX - radius), y: Math.round(clampedY + radius * 0.6) },
  ];
}

/**
 * Computes total length of a closed waypoint loop
 */
export function getFlightPathLength(path: Waypoint[]): number {
  if (path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % path.length];
    total += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  return total;
}

/**
 * Updates aircraft position along a closed waypoint path smoothly
 */
export function advanceFlightPath(
  path: Waypoint[],
  currentProgressDistance: number,
  speed: number,
  dt: number
): { x: number; y: number; rotation: number; newProgressDistance: number } {
  if (path.length === 0) {
    return { x: 450, y: 250, rotation: 0, newProgressDistance: 0 };
  }
  if (path.length === 1) {
    return { x: path[0].x, y: path[0].y, rotation: 0, newProgressDistance: 0 };
  }

  const totalLength = getFlightPathLength(path);
  if (totalLength <= 0) {
    return { x: path[0].x, y: path[0].y, rotation: 0, newProgressDistance: 0 };
  }

  const advancedDistance = (currentProgressDistance + speed * dt) % totalLength;

  let accumulated = 0;
  for (let i = 0; i < path.length; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % path.length];
    const segmentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    if (segmentDist <= 0) continue;

    if (accumulated + segmentDist >= advancedDistance) {
      const segmentProgress = (advancedDistance - accumulated) / segmentDist;
      const x = p1.x + (p2.x - p1.x) * segmentProgress;
      const y = p1.y + (p2.y - p1.y) * segmentProgress;
      const rotation = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        rotation,
        newProgressDistance: advancedDistance,
      };
    }

    accumulated += segmentDist;
  }

  return {
    x: path[0].x,
    y: path[0].y,
    rotation: 0,
    newProgressDistance: 0,
  };
}

/**
 * Validates a flight path
 */
export function validateFlightPath(path: Waypoint[]): { valid: boolean; reason?: string } {
  if (path.length < 2) {
    return { valid: false, reason: 'Flight route requires at least 2 waypoints' };
  }
  if (path.length > 8) {
    return { valid: false, reason: 'Flight route cannot exceed 8 waypoints' };
  }

  for (const wp of path) {
    if (wp.x < 20 || wp.x > 880 || wp.y < 20 || wp.y > 530) {
      return { valid: false, reason: 'Waypoints must stay within the tactical airspace' };
    }
  }

  return { valid: true };
}
