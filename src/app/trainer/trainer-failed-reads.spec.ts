import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Trainer } from './trainer';

function text(node: Element): string {
  return node.textContent?.trim().replace(/\s+/g, ' ') ?? '';
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

/** Fails the newest read whose URL matches, with the backend's own reason. */
function refuse(
  http: HttpTestingController,
  match: (url: string) => boolean,
  detail: string,
): void {
  http
    .expectOne((req) => match(req.url))
    .flush({ detail }, { status: 503, statusText: 'Unavailable' });
}

describe('Trainer failed readings', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trainer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('names the corpus reading that failed instead of praising an empty inbox', () => {
    const fixture = TestBed.createComponent(Trainer);
    fixture.detectChanges();

    refuse(http, (url) => url.includes('/faq/inbox'), 'The pending questions are stored away.');
    refuse(http, (url) => url.endsWith('/faq'), 'The pending questions are stored away.');
    http.expectOne((req) => req.url.endsWith('/documents')).flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(text(query(compiled, '.page-error'))).toContain(
      'The training corpus was not read: The pending questions are stored away.',
    );
    expect(compiled.querySelector('.trainer-content .empty')).toBeNull();
    expect(compiled.textContent).not.toContain('Good job');

    fixture.componentInstance.setTab('faqs');
    fixture.detectChanges();
    expect(compiled.querySelector('.result-count')).toBeNull();
    expect(Array.from(compiled.querySelectorAll('.status-pill .count')).map(text)).toEqual([
      '—',
      '—',
      '—',
      '—',
      '—',
    ]);
    fixture.componentInstance.setTab('inbox');
    fixture.detectChanges();

    query<HTMLButtonElement>(compiled, '.page-error button').click();
    http.expectOne((req) => req.url.includes('/faq/inbox')).flush([]);
    http.expectOne((req) => req.url.endsWith('/faq')).flush([]);
    fixture.detectChanges();

    expect(compiled.querySelector('.page-error')).toBeNull();
    expect(compiled.textContent).toContain('No pending questions');
    http.verify();
  });

  it('names the document reading that failed instead of an empty shelf', () => {
    const fixture = TestBed.createComponent(Trainer);
    fixture.detectChanges();

    http.expectOne((req) => req.url.includes('/faq/inbox')).flush([]);
    http.expectOne((req) => req.url.endsWith('/faq')).flush([]);
    refuse(http, (url) => url.endsWith('/documents'), 'The index is being rebuilt.');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(text(query(compiled, '.page-error'))).toContain(
      'The document list was not read: The index is being rebuilt.',
    );

    fixture.componentInstance.setTab('documents');
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/ingest/jobs')).flush([]);
    fixture.detectChanges();

    expect(compiled.querySelector('.trainer-content .empty')).toBeNull();
    expect(compiled.textContent).not.toContain('No documents uploaded yet');

    query<HTMLButtonElement>(compiled, '.page-error button').click();
    http
      .expectOne((req) => req.url.endsWith('/documents'))
      .flush([{ source: 'handbook.pdf', chunks: 12 }]);
    fixture.detectChanges();

    expect(compiled.querySelector('.page-error')).toBeNull();
    expect(text(query(compiled, '.doc-card:not(.upload-card) .doc-name'))).toBe('handbook.pdf');
    http.verify();
  });
});
