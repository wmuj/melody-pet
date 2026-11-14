import type { MelodyPetApi } from '../electron/shared';
export * from '../electron/shared';
declare global { interface Window { melodyPet: MelodyPetApi } }
