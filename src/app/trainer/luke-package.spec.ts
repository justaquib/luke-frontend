import { type HttpTestingController, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserService } from '../core/browser.service';
import { UiService } from '../shared/ui.service';
import { LukePackage } from './luke-package';
import {
  flushPackage,
  packageButton,
  packageCheck,
  packagePreview,
  pickPackage,
  renderPackage,
  setupPackage,
} from './luke-package.fixtures';

describe('LukePackage downloads', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    http = await setupPackage();
  });
  afterEach(() => http.verify());

  it('defaults to full and labels actual contents, filename and base identity', () => {
    const { compiled } = renderPackage(http);
    expect(compiled.textContent).toContain('Luke · level 0.1.0');
    expect(compiled.textContent).toContain('1622 line(s)');
    expect(compiled.textContent).toContain('Uncompressed contents');
    expect(compiled.textContent).toContain('987654321 bytes · 25 files');
    expect(compiled.textContent).toContain('luke-full.zip');
    expect(compiled.textContent).toContain('test/foundation');
    expect(compiled.textContent).toContain('test-revision');
    expect(compiled.textContent).toContain('a'.repeat(64));
    expect(compiled.textContent).toContain('Includes foundation weights');
    expect(compiled.textContent).toContain('Lessons · 500');
    expect(compiled.textContent).toContain('12 unanswered question(s)');
    expect(compiled.textContent).toContain('1 fine-tuned teacher(s) are left out');
    expect(compiled.querySelector<HTMLInputElement>('input[value="full"]')?.checked).toBe(true);
    expect(packageButton(compiled, 'Download Luke').disabled).toBe(false);
  });

  it.each(['full', 'slim'] as const)(
    'downloads %s with its preview filename and locks controls',
    (mode) => {
      const download = vi
        .spyOn(TestBed.inject(BrowserService), 'downloadBlob')
        .mockImplementation((): void => undefined);
      const { fixture, compiled } = renderPackage(http);
      compiled.querySelector<HTMLInputElement>(`input[value="${mode}"]`)?.click();
      fixture.detectChanges();
      expect(compiled.textContent).toContain(`luke-${mode}.zip`);
      if (mode === 'slim') {
        expect(compiled.textContent).toContain('2572268 bytes · 15 files');
        expect(compiled.textContent).toContain('Foundation weights are not included');
      }
      packageButton(compiled, 'Download Luke').click();
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Packing…');
      expect(packageButton(compiled, 'Refresh the package').disabled).toBe(true);
      expect(packageButton(compiled, 'Import ZIP package').disabled).toBe(true);
      expect(compiled.querySelector('fieldset')?.disabled).toBe(true);
      const request = http.expectOne((call) => call.url.endsWith('/language-model/export'));
      expect(request.request.params.get('mode')).toBe(mode);
      expect(request.request.responseType).toBe('blob');
      const zip = new Blob(['PK'], { type: 'application/zip' });
      request.flush(zip);
      fixture.detectChanges();
      expect(download).toHaveBeenCalledWith(zip, `luke-${mode}.zip`);
      expect(packageButton(compiled, 'Import ZIP package').disabled).toBe(false);
      expect(compiled.textContent).not.toContain('Packing…');
    },
  );

  it('recovers from a refused preview through refresh while import remains available', () => {
    const fixture = TestBed.createComponent(LukePackage);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/language-model/export/preview'))
      .flush({ detail: 'Cannot count the package.' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cannot count the package.');
    expect(packageButton(compiled, 'Download Luke').disabled).toBe(true);
    expect(packageButton(compiled, 'Import ZIP package').disabled).toBe(false);
    expect(TestBed.inject(UiService).toasts().at(-1)?.kind).toBe('error');
    packageButton(compiled, 'Refresh the package').click();
    flushPackage(http);
    fixture.detectChanges();
    expect(compiled.querySelector('.error')).toBeNull();
    expect(packageButton(compiled, 'Download Luke').disabled).toBe(false);
  });

  it('clears download failures on retry and never saves an error response as a ZIP', () => {
    const download = vi
      .spyOn(TestBed.inject(BrowserService), 'downloadBlob')
      .mockImplementation((): void => undefined);
    const { fixture, compiled } = renderPackage(http);
    packageButton(compiled, 'Download Luke').click();
    http
      .expectOne((call) => call.url.endsWith('/language-model/export'))
      .flush(new Blob(['failure']), { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(compiled.querySelector('.error')).not.toBeNull();
    expect(download).not.toHaveBeenCalled();
    packageButton(compiled, 'Download Luke').click();
    fixture.detectChanges();
    expect(compiled.querySelector('.error')).toBeNull();
    http.expectOne((call) => call.url.endsWith('/language-model/export')).flush(new Blob(['PK']));
    fixture.detectChanges();
    expect(packageButton(compiled, 'Download Luke').disabled).toBe(false);
  });

  it('does not claim missing foundation weights are included', () => {
    const initial = packagePreview();
    initial.checkpoints = [];
    initial.modes.full.includes_base = false;
    const { compiled } = renderPackage(http, initial);
    expect(compiled.textContent).toContain('Luke has no checkpoint yet.');
    expect(compiled.textContent).toContain('Foundation weights are not included');
  });
});

describe('LukePackage import', () => {
  let http: HttpTestingController;

  const applied = {
    applied: true,
    files: { state: 4 },
    rows: { documents: 3, faqs: 12 },
    indexed: { documents: 3, faqs: 12 },
    verified: { counts: { documents: 3 }, samples: { documents: 1, faqs: 1 } },
  };

  beforeEach(async () => {
    http = await setupPackage();
  });
  afterEach(() => http.verify());

  function dryRun(compiled: HTMLElement): TestRequest {
    pickPackage(compiled);
    return http.expectOne((call) => call.url.endsWith('/language-model/package/import'));
  }

  it('checks the ZIP, asks before replacing, restores and refreshes', () => {
    const { fixture, compiled } = renderPackage(http);
    const check = dryRun(compiled);
    fixture.detectChanges();
    expect(check.request.method).toBe('POST');
    expect(check.request.params.get('dry_run')).toBe('true');
    expect(check.request.params.get('replace')).toBe('false');
    expect((check.request.body as FormData).get('file')).toBeInstanceOf(File);
    expect(compiled.querySelector('input[type="file"]')?.hasAttribute('disabled')).toBe(true);
    check.flush(packageCheck());
    fixture.detectChanges();
    const ui = TestBed.inject(UiService);
    expect(ui.confirm()?.title).toBe('Replace this workspace?');
    expect(ui.confirm()?.danger).toBe(true);
    expect(ui.confirm()?.message).toContain('25 files checked');
    expect(ui.confirm()?.message).toContain('documents: 3 · faqs: 12');
    ui.resolveConfirm(true);
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Restoring and verifying');
    const restore = http.expectOne((call) => call.url.endsWith('/language-model/package/import'));
    expect(restore.request.params.get('dry_run')).toBe('false');
    expect(restore.request.params.get('replace')).toBe('true');
    restore.flush(applied);
    fixture.detectChanges();
    expect(ui.toasts().at(-1)).toMatchObject({
      kind: 'success',
      message: expect.stringContaining('Restored Luke was restored'),
    });
    http
      .expectOne((call) => call.url.endsWith('/language-model/export/preview'))
      .flush(packagePreview());
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Restored Luke was restored');
    expect(packageButton(compiled, 'Import ZIP package').disabled).toBe(false);
  });

  it('restores into an empty workspace without claiming a replacement', () => {
    const { fixture, compiled } = renderPackage(http);
    dryRun(compiled).flush(packageCheck({ replace_required: false }));
    fixture.detectChanges();
    const ui = TestBed.inject(UiService);
    expect(ui.confirm()?.title).toBe('Restore this package?');
    expect(ui.confirm()?.danger).toBe(false);
    ui.resolveConfirm(true);
    fixture.detectChanges();
    const restore = http.expectOne((call) => call.url.endsWith('/language-model/package/import'));
    expect(restore.request.params.get('replace')).toBe('false');
    restore.flush(applied);
    fixture.detectChanges();
    http
      .expectOne((call) => call.url.endsWith('/language-model/export/preview'))
      .flush(packagePreview());
  });

  it('writes nothing when the operator cancels the confirmation', () => {
    const { fixture, compiled } = renderPackage(http);
    dryRun(compiled).flush(packageCheck());
    fixture.detectChanges();
    TestBed.inject(UiService).resolveConfirm(false);
    fixture.detectChanges();
    http.expectNone((call) => call.url.endsWith('/language-model/package/import'));
    expect(compiled.textContent).toContain('Restore cancelled. No changes were made.');
    expect(packageButton(compiled, 'Import ZIP package').disabled).toBe(false);
  });

  it('refuses an incomplete dry-run report without asking to restore', () => {
    const { fixture, compiled } = renderPackage(http);
    dryRun(compiled).flush({ applied: false, mode: 'full' });
    fixture.detectChanges();
    expect(TestBed.inject(UiService).confirm()).toBeNull();
    expect(compiled.textContent).toContain('The dry-run report is incomplete.');
    http.expectNone((call) => call.url.endsWith('/language-model/package/import'));
  });

  it('never claims success when the restore result is incomplete', () => {
    const { fixture, compiled } = renderPackage(http);
    dryRun(compiled).flush(packageCheck());
    fixture.detectChanges();
    TestBed.inject(UiService).resolveConfirm(true);
    fixture.detectChanges();
    http
      .expectOne((call) => call.url.endsWith('/language-model/package/import'))
      .flush({ applied: true, rows: { documents: 3 }, indexed: { documents: 3 } });
    fixture.detectChanges();
    expect(compiled.textContent).toContain('The restore result is incomplete.');
    expect(TestBed.inject(UiService).toasts().at(-1)?.kind).toBe('error');
    expect(compiled.textContent).not.toContain('was restored');
  });

  it('rejects a non-ZIP choice before any request', () => {
    const { fixture, compiled } = renderPackage(http);
    pickPackage(compiled, new File(['notes'], 'notes.txt'));
    fixture.detectChanges();
    http.expectNone((call) => call.url.endsWith('/language-model/package/import'));
    expect(compiled.textContent).toContain('Choose a non-empty ZIP package');
  });
});
