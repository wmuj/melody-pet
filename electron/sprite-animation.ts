export const SPRITE_WIDTH = 192;
export const SPRITE_HEIGHT = 208;
export const SPRITE_FRAMES = [6, 8, 8, 4, 5, 8, 6, 6, 6, 8, 8] as const;
export function animationFrame(row: number, elapsed: number, interval: number, loop = true) {
  const count = SPRITE_FRAMES[row] || 1;
  const index = Math.max(0, Math.floor(elapsed / Math.max(1, interval)));
  return loop ? index % count : Math.min(count - 1, index);
}
export function lookFrame(dx: number, dy: number) {
  const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  const direction = Math.round(angle / 22.5) % 16;
  return { row: direction < 8 ? 9 : 10, frame: direction % 8 };
}
