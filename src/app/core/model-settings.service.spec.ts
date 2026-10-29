import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import type { ModelSettingsDocument } from './api/language-brain.types';
import { LanguageModelApiService } from './api/language-model-api.service';
import { AppPrefsService } from './app-prefs.service';
import { ModelSettingsService } from './model-settings.service';

function document(overrides: Partial<ModelSettingsDocument>): ModelSettingsDocument {
  return {
    name: 'Luke',
    start_level: '0.0.0',
    level: '0.0.0',
    defaults: { name: 'Luke', start_level: '0.0.0' },
    levels: [],
    ...overrides,
  };
}

function setup(reply: ModelSettingsDocument): {
  service: ModelSettingsService;
  prefs: AppPrefsService;
} {
  TestBed.configureTestingModule({
    providers: [
      AppPrefsService,
      ModelSettingsService,
      { provide: LanguageModelApiService, useValue: { modelSettings: () => of(reply) } },
    ],
  });
  return {
    service: TestBed.inject(ModelSettingsService),
    prefs: TestBed.inject(AppPrefsService),
  };
}

function setupApi(api: Record<string, () => Observable<unknown>>): ModelSettingsService {
  TestBed.configureTestingModule({
    providers: [
      AppPrefsService,
      ModelSettingsService,
      { provide: LanguageModelApiService, useValue: api },
    ],
  });
  return TestBed.inject(ModelSettingsService);
}

describe('ModelSettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('takes the model name from the backend for the chat and the shell', () => {
    const { service, prefs } = setup(document({ name: 'Ada' }));
    service.load();
    expect(service.name()).toBe('Ada');
    expect(prefs.botName()).toBe('Ada');
  });

  it('keeps the current name when the reply carries none', () => {
    const reply = { ...document({}), name: undefined } as unknown as ModelSettingsDocument;
    const { service, prefs } = setup(reply);
    expect(() => service.load()).not.toThrow();
    expect(prefs.botName()).toBe('Luke');
    expect(service.name()).toBe('Luke');
  });

  it('reports a failed reading as a reading failure, not a saving one', () => {
    const service = setupApi({
      modelSettings: () => throwError(() => new Error('the backend is offline')),
    });

    service.load();

    expect(service.error()).toBe('the backend is offline');
    expect(service.saveError()).toBeNull();
  });

  it('reports a refused save without claiming the identity was never read', () => {
    const service = setupApi({
      modelSettings: () => of(document({ level: '0.1.0' })),
      saveModelSettings: () => throwError(() => new Error('that version is not on the ladder')),
    });
    service.load();

    service.save('Ada', '9.9.9').subscribe({ error: () => undefined });

    expect(service.saveError()).toBe('that version is not on the ladder');
    expect(service.error()).toBeNull();
    expect(service.level()).toBe('0.1.0');
  });
});
