export type VoiceLanguage = 'en' | 'hi' | 'ur';
export type VoiceGender = 'female' | 'male';
export type VoiceLanguageFlags = Record<VoiceLanguage, boolean>;

export interface VoiceModelOption {
  value: string;
  label: string;
  model: string;
  language: VoiceLanguage;
  gender: VoiceGender;
}

export const VOICE_LANGUAGE_KEY = 'assistance.voice.language.v2';
export const VOICE_GENDER_KEY = 'assistance.voice.gender.v1';
export const VOICE_LANGUAGES_KEY = 'assistance.voice.enabledLanguages.v2';

export const VOICE_MODEL_OPTIONS: VoiceModelOption[] = [
  { value: 'en', label: 'English', model: 'en_US-lessac-medium', language: 'en', gender: 'female' },
  { value: 'hi', label: 'हिन्दी', model: 'hi_IN-pratham-medium', language: 'hi', gender: 'female' },
  {
    value: 'ur-female',
    label: 'اردو · Female',
    model: 'ur_PK-aegis_female-medium',
    language: 'ur',
    gender: 'female',
  },
  {
    value: 'ur-male',
    label: 'اردو · Male',
    model: 'ur_PK-fasih-medium-model',
    language: 'ur',
    gender: 'male',
  },
];

export function voiceModelValue(language: VoiceLanguage, gender: VoiceGender): string {
  if (language === 'ur') return gender === 'male' ? 'ur-male' : 'ur-female';
  return language;
}

export function findVoiceModel(value: string): VoiceModelOption | undefined {
  return VOICE_MODEL_OPTIONS.find((option) => option.value === value);
}

export function voiceModelLabel(value: string): string {
  const option = findVoiceModel(value);
  return option ? `${option.label} · ${option.model}` : 'voice';
}

export function availableVoiceModels(
  entries: { value: string; cached: boolean }[],
): VoiceModelOption[] {
  const installed = new Set(entries.filter((entry) => entry.cached).map((entry) => entry.value));
  return VOICE_MODEL_OPTIONS.filter((option) => installed.has(option.value));
}

export function loadEnabledVoiceLanguages(): VoiceLanguageFlags {
  try {
    const value = JSON.parse(
      localStorage.getItem(VOICE_LANGUAGES_KEY) ?? '{}',
    ) as Partial<VoiceLanguageFlags>;
    const result = { en: value.en !== false, hi: value.hi !== false, ur: value.ur !== false };
    return result.en || result.hi || result.ur ? result : { en: true, hi: false, ur: false };
  } catch {
    return { en: true, hi: true, ur: true };
  }
}

export function saveEnabledVoiceLanguages(flags: VoiceLanguageFlags): void {
  try {
    localStorage.setItem(VOICE_LANGUAGES_KEY, JSON.stringify(flags));
  } catch {
    // Storage is unavailable; the setting stays for this session only.
  }
}

export function firstEnabledVoiceLanguage(flags: VoiceLanguageFlags): VoiceLanguage {
  return (['ur', 'en', 'hi'] as const).find((language) => flags[language]) ?? 'en';
}
