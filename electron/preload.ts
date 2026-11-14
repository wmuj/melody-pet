import { contextBridge, ipcRenderer } from 'electron';
import type { MelodyPetApi } from './shared';

function subscribe<T>(channel: string, cb: (payload: T) => void) {
  const handler = (_event: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => { ipcRenderer.removeListener(channel, handler); };
}

const api: MelodyPetApi = {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('pet:setIgnoreMouse', ignore),
  getBounds: () => ipcRenderer.invoke('pet:getBounds'),
  beginDrag: () => ipcRenderer.invoke('pet:beginDrag'),
  setPosition: (x, y) => ipcRenderer.send('pet:setPosition', { x, y }),
  finishDrag: (vx, vy) => ipcRenderer.invoke('pet:finishDrag', { vx, vy }),
  onBoundsChanged: (cb) => subscribe('pet:bounds', cb),
  onCursorPosition: (cb) => subscribe('pet:cursor', cb),
  getSmtcState: () => ipcRenderer.invoke('smtc:get'),
  onSmtcState: (cb) => subscribe('smtc:state', cb),
  sendSmtcCommand: (cmd, appId) => ipcRenderer.send('smtc:command', { cmd, appId }),
  fetchLyrics: (title, artist) => ipcRenderer.invoke('lyrics:fetch', { title, artist }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  addAffection: (amount) => ipcRenderer.invoke('pet:affection', amount),
  onSettingsChanged: (cb) => subscribe('settings:changed', cb),
  popupMenu: (x, y) => ipcRenderer.send('pet:popupMenu', { x, y }),
  onMenuAction: (cb) => subscribe('pet:menuAction', cb),
  petAction: (action) => ipcRenderer.send('pet:action', action),
  setInteraction: (state) => ipcRenderer.send('pet:interaction', state),
  onMotionChanged: (cb) => subscribe('pet:motion', cb),
  openSettingsWindow: () => ipcRenderer.send('settings:open'),
  showPet: () => ipcRenderer.send('pet:show'),
  hidePet: () => ipcRenderer.send('pet:hide'),
  quitApp: () => ipcRenderer.send('app:quit'),
  selectMediaFile: () => ipcRenderer.invoke('packs:selectFile'),
  listPacks: () => ipcRenderer.invoke('packs:list'),
  importPack: (input) => ipcRenderer.invoke('packs:import', input),
  deletePack: (id) => ipcRenderer.invoke('packs:delete', id),
  onPacksChanged: (cb) => subscribe('packs:changed', cb),
  importCodexPet: () => ipcRenderer.invoke('packs:importCodex'),
  openPetGallery: () => ipcRenderer.send('pets:gallery'),
  getCompanionMemory: () => ipcRenderer.invoke('companion:get'),
  clearCompanionMemory: () => ipcRenderer.invoke('companion:clear'),
  interact: (kind, zone) => ipcRenderer.invoke('companion:interact', { kind, zone }),
  onCompanionMemory: (cb) => subscribe('companion:changed', cb),
  onPetResponse: (cb) => subscribe('pet:response', cb),
  getVoices: () => ipcRenderer.invoke('speech:voices'),
  speak: (text) => ipcRenderer.invoke('speech:speak', text),
  stopSpeaking: () => ipcRenderer.send('speech:stop'),
  getSpeechState: () => ipcRenderer.invoke('speech:state'),
  onSpeechState: (cb) => subscribe('speech:changed', cb),
};
contextBridge.exposeInMainWorld('melodyPet', api);
