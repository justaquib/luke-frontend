import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { LukePackageCheck, LukePackagePreview } from '../core/api/luke-package';
import { LukePackage } from './luke-package';

export function packagePreview(overrides: Partial<LukePackagePreview> = {}): LukePackagePreview {
  return {
    model: { name: 'Luke', start_level: '0.0.0', approved_level: '0.1.0' },
    available: 1622,
    by_kind: { lesson: 500, starter_lesson: 533, document: 387 },
    checkpoints: [{ name: 'words-0.pt', bytes: 2557967 }],
    teachers: [{ name: 'Teacher', model_id: 'test/teacher', steps: 200, bytes: 268435456 }],
    pending: 12,
    bytes: 987654321,
    filename: 'luke-full.zip',
    modes: {
      full: { bytes: 987654321, files: 25, includes_base: true, filename: 'luke-full.zip' },
      slim: { bytes: 2572268, files: 15, includes_base: false, filename: 'luke-slim.zip' },
    },
    base: {
      included: true,
      installed: true,
      base_model: 'test/foundation',
      revision: 'test-revision',
      weight_sha256: 'a'.repeat(64),
    },
    ...overrides,
  };
}

export function packageCheck(overrides: Partial<LukePackageCheck> = {}): LukePackageCheck {
  return {
    applied: false,
    replace_required: true,
    format: 'luke-package',
    format_version: 2,
    mode: 'full',
    workspace: 0,
    model: { name: 'Restored Luke' },
    counts: { documents: 3, faqs: 12 },
    files: { checked: 25, bytes: 987654321 },
    base_model: packagePreview().base,
    tokenizers: [],
    ...overrides,
  };
}

export async function setupPackage(): Promise<HttpTestingController> {
  await TestBed.configureTestingModule({
    imports: [LukePackage],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  return TestBed.inject(HttpTestingController);
}

export function flushPackage(http: HttpTestingController, initial = packagePreview()): void {
  http
    .expectOne((request) => request.url.endsWith('/language-model/export/preview'))
    .flush(initial);
}

export function renderPackage(
  http: HttpTestingController,
  initial = packagePreview(),
): {
  fixture: ComponentFixture<LukePackage>;
  compiled: HTMLElement;
} {
  const fixture = TestBed.createComponent(LukePackage);
  fixture.detectChanges();
  flushPackage(http, initial);
  fixture.detectChanges();
  return { fixture, compiled: fixture.nativeElement as HTMLElement };
}

export function packageButton(compiled: HTMLElement, label: string): HTMLButtonElement {
  const button = compiled.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`Missing ${label} button`);
  return button;
}

export function pickPackage(compiled: HTMLElement, file = new File(['PK'], 'restore.zip')): void {
  const input = compiled.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Missing ZIP input');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}
