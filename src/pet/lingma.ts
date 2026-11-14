/** The user's original Lingma V2 atlas, bundled so it works without Codex or a network. */
export const LINGMA_PREVIEW = new URL('../assets/lingma/preview.png', import.meta.url).href;

export const LINGMA_SPRITE = {
  url: new URL('../assets/lingma/spritesheet.png', import.meta.url).href,
  version: 2 as const,
  followCursor: true,
  // Lingma's waiting row is playful; the lowered, closed-eye pose suits a nap.
  sleepFrame: { row: 5, frame: 3 },
  speakingRow: 7,
  ariaLabel: '灵码小狐狸',
};
