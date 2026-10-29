import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import type { ExpressionView } from '../core/api/expressions-api.service';
import { PageInfoService } from '../shared/page-info.service';
import { UiService } from '../shared/ui.service';
import { Expressions } from './expressions';

function view(): ExpressionView {
  return {
    items: [
      {
        id: 'a1',
        category: 'open',
        label: 'Opening',
        phrase: 'Good morning, Luke',
        reply: 'Good morning. What would you like to talk about?',
      },
      {
        id: 'b2',
        category: 'close',
        label: 'Closing',
        phrase: 'That is all for now',
        reply: 'Understood. I will be here when you come back.',
      },
    ],
    categories: [
      { id: 'open', label: 'Opening', description: 'How Luke starts.', count: 1 },
      { id: 'close', label: 'Closing', description: 'How Luke ends.', count: 1 },
      { id: 'pause', label: 'Pausing', description: 'How Luke pauses.', count: 0 },
      { id: 'resume', label: 'Resuming', description: 'How Luke resumes.', count: 0 },
    ],
    limits: { items: 120, phrase: 80, reply: 240 },
  };
}

function input(compiled: HTMLElement, selector: string): HTMLInputElement {
  const element = compiled.querySelector<HTMLInputElement>(selector);
  if (!element) throw new Error(`Missing control: ${selector}`);
  return element;
}

describe('Expressions', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Expressions],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('shows the four moments and the phrases taught in each', async () => {
    const fixture = TestBed.createComponent(Expressions);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.expressions-card').length).toBe(4);
    expect(compiled.textContent).toContain('Good morning, Luke');
    expect(compiled.textContent).toContain('Understood. I will be here when you come back.');
    expect(compiled.textContent).toContain('Nothing taught yet.');
    const info = TestBed.inject(PageInfoService);
    expect(info.facts()).toBeTruthy();
    expect(info.actions()).toBeTruthy();
    http.verify();
  });

  it('teaches an expression from its card and reloads the list', async () => {
    const fixture = TestBed.createComponent(Expressions);
    const http = TestBed.inject(HttpTestingController);
    const ui = TestBed.inject(UiService);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.add-row')?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('[role="dialog"] h2')?.textContent?.trim()).toBe(
      'Teach an expression',
    );
    input(compiled, 'input[name="expression-phrase"]').value = '  Hello there  ';
    input(compiled, 'input[name="expression-phrase"]').dispatchEvent(new Event('input'));
    const reply = compiled.querySelector<HTMLTextAreaElement>('textarea[name="expression-reply"]');
    if (!reply) throw new Error('Missing reply field');
    reply.value = ' Hello. How can I help? ';
    reply.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    compiled.querySelector('form#expression-form')?.dispatchEvent(new Event('submit'));
    const saved = http.expectOne(
      (req) => req.url.endsWith('/language-model/expressions') && req.method === 'POST',
    );
    expect(saved.request.body).toEqual({
      category: 'open',
      phrase: 'Hello there',
      reply: 'Hello. How can I help?',
    });
    saved.flush({
      id: 'c3',
      category: 'open',
      label: 'Opening',
      phrase: 'Hello there',
      reply: 'Hello. How can I help?',
    });

    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    fixture.detectChanges();

    expect(ui.toasts().at(-1)?.message).toBe('Expression taught.');
    expect(compiled.querySelector('[role="dialog"]')).toBeNull();
    http.verify();
  });

  it('edits a taught expression in place', async () => {
    const fixture = TestBed.createComponent(Expressions);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled
      .querySelector<HTMLButtonElement>('button[aria-label="Edit Good morning, Luke"]')
      ?.click();
    fixture.detectChanges();

    expect(input(compiled, 'input[name="expression-phrase"]').value).toBe('Good morning, Luke');
    input(compiled, 'input[name="expression-phrase"]').value = 'Morning, Luke';
    input(compiled, 'input[name="expression-phrase"]').dispatchEvent(new Event('input'));
    fixture.detectChanges();

    compiled.querySelector('form#expression-form')?.dispatchEvent(new Event('submit'));
    const saved = http.expectOne(
      (req) => req.url.endsWith('/language-model/expressions/a1') && req.method === 'PUT',
    );
    expect(saved.request.body).toMatchObject({ phrase: 'Morning, Luke', category: 'open' });
    saved.flush({
      id: 'a1',
      category: 'open',
      label: 'Opening',
      phrase: 'Morning, Luke',
      reply: 'Good morning. What would you like to talk about?',
    });

    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    http.verify();
  });

  it('removes an expression only after confirmation', async () => {
    const fixture = TestBed.createComponent(Expressions);
    const http = TestBed.inject(HttpTestingController);
    const ui = TestBed.inject(UiService);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled
      .querySelector<HTMLButtonElement>('button[aria-label="Remove Good morning, Luke"]')
      ?.click();
    fixture.detectChanges();
    expect(ui.confirm()?.title).toBe('Remove “Good morning, Luke”?');

    ui.resolveConfirm(true);
    const removed = http.expectOne(
      (req) => req.url.endsWith('/language-model/expressions/a1') && req.method === 'DELETE',
    );
    removed.flush({ removed: 'a1' });

    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    fixture.detectChanges();

    expect(ui.toasts().at(-1)?.message).toBe('Expression removed.');
    http.verify();
  });

  it('says so when the expressions cannot be read and retries', async () => {
    const fixture = TestBed.createComponent(Expressions);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne((req) => req.url.endsWith('/language-model/expressions'))
      .flush(
        { detail: 'The expressions file could not be read.' },
        { status: 500, statusText: 'Error' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.state-card h2')?.textContent?.trim()).toBe(
      'Could not read the expressions',
    );
    expect(compiled.textContent).toContain('The expressions file could not be read.');

    compiled.querySelector<HTMLButtonElement>('.state-card button')?.click();
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/language-model/expressions')).flush(view());
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.expressions-card').length).toBe(4);
    http.verify();
  });
});
