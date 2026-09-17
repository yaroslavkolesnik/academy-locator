export const SNAPS = ['peek', 'half', 'full'];
export const DRAG_THRESHOLD = 40;

// deltaY < 0 — палець рухається вгору (шторка відкривається)
export function nextSnap(current, deltaY) {
  const index = SNAPS.indexOf(current);
  if (deltaY <= -DRAG_THRESHOLD) return SNAPS[Math.min(index + 1, SNAPS.length - 1)];
  if (deltaY >= DRAG_THRESHOLD) return SNAPS[Math.max(index - 1, 0)];
  return current;
}

export function cycleSnap(current) {
  return SNAPS[(SNAPS.indexOf(current) + 1) % SNAPS.length];
}

export function initialSnap(pathname) {
  return pathname === '/add' ? 'peek' : 'half';
}
