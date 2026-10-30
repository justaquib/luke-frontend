/**
 * Voice module configuration for Luke.
 *
 * The voice stack is swappable: the backend registers one or more modules
 * (each bundling a TTS engine and an STT engine), and the tenant chooses which
 * one to use in settings. This file holds the client-side metadata and
 * localStorage keys.
 */

export type VoiceModuleId = 'melo-whisper';

export interface VoiceModuleOption {
  id: VoiceModuleId;
  label: string;
  ttsEngine: string;
  sttEngine: string;
  description: string;
}

export interface VoiceInfo {
  id: string;
  label: string;
  language: string;
  gender: string;
}

export const VOICE_MODULE_KEY = 'assistance.voice.module.v1';
export const VOICE_ENABLED_KEY = 'assistance.voice.enabled.v1';
export const VOICE_ACTIVE_VOICE_KEY = 'assistance.voice.activeVoice.v1';

export const VOICE_MODULE_OPTIONS: VoiceModuleOption[] = [
  {
    id: 'melo-whisper',
    label: 'MeloTTS + Whisper',
    ttsEngine: 'facebook/mms-tts-eng',
    sttEngine: 'openai/whisper-tiny',
    description: 'Minimal English TTS (MeloTTS/MMS) + English STT (Whisper tiny).',
  },
];

export function loadVoiceModule(): VoiceModuleId {
  try {
    const value = localStorage.getItem(VOICE_MODULE_KEY);
    if (value && VOICE_MODULE_OPTIONS.some((m) => m.id === value)) {
      return value as VoiceModuleId;
    }
  } catch {
    // Storage is unavailable; fall through to default.
  }
  return 'melo-whisper';
}

export function saveVoiceModule(id: VoiceModuleId): void {
  try {
    localStorage.setItem(VOICE_MODULE_KEY, id);
  } catch {
    // Storage can be unavailable in private browsing; the choice is session-only.
  }
}

export function loadVoiceEnabled(): boolean {
  try {
    return localStorage.getItem(VOICE_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveVoiceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
  } catch {
    // Storage can be unavailable; the choice is session-only.
  }
}

export function loadActiveVoice(): string | null {
  try {
    return localStorage.getItem(VOICE_ACTIVE_VOICE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveVoice(voiceId: string): void {
  try {
    localStorage.setItem(VOICE_ACTIVE_VOICE_KEY, voiceId);
  } catch {
    // Storage can be unavailable; the choice is session-only.
  }
}

export function findVoiceModule(id: VoiceModuleId): VoiceModuleOption | undefined {
  return VOICE_MODULE_OPTIONS.find((m) => m.id === id);
}
