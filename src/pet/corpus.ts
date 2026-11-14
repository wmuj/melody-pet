import { DialogueDeck, type DialogueContext } from '../../electron/dialogue';
const deck = new DialogueDeck();
export function pickContextualLine(opts: DialogueContext) { return deck.pick(opts); }
export function resetContextualLines() { deck.reset(); }
