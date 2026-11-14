import type { SmtcState } from './shared';
/** Zero-duration media sessions provide no usable clock for synchronized lyrics. */
export function canSyncLyrics(state: SmtcState) {
  return Boolean(state.hasSession && Number.isFinite(state.durationMs) && state.durationMs! > 0
    && Number.isFinite(state.positionMs) && state.positionMs! >= 0 && state.positionMs! <= state.durationMs! + 1000);
}
