import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { DocumentsApiService } from '../core/api/documents-api.service';
import type { IngestJob } from '../core/api/api-models';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { Trainer } from './trainer';

function text(node: Element): string {
  return node.textContent?.trim() ?? '';
}

function ingestJob(overrides: Partial<IngestJob> = {}): IngestJob {
  return {
    id: 7,
    source: 'people.csv',
    status: 'queued',
    step: 'Waiting to start',
    progress: 0,
    done: 0,
    total: 0,
    chunks: 0,
    duplicates: { stored: 0, exact: 0, near: 0 },
    error: null,
    created_at: null,
    started_at: null,
    finished_at: null,
    ...overrides,
  };
}

function query(root: ParentNode, selector: string): Element {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

function modelSettings(): Record<string, unknown> {
  return {
    name: 'Luke',
    start_level: '0.0.0',
    level: '0.0.0',
    defaults: { name: 'Luke', start_level: '0.0.0' },
    levels: [],
  };
}

describe('Trainer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trainer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('renders the intent merge view for the merge tab', async () => {
    const fixture = TestBed.createComponent(Trainer);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.setTab('merge');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.merge-search-card')).toBeTruthy();
    expect(compiled.querySelector('.merge-search-card input.search')).toBeTruthy();
    expect(compiled.querySelector('.merge-search-card h3')?.textContent?.trim()).toBe(
      'Find related questions to merge',
    );
  });

  it('puts the corpus state in the shared info panel', () => {
    const fixture = TestBed.createComponent(Trainer);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const faqs = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      question: `Question ${index + 1}`,
      answer: `Answer ${index + 1}`,
      status: 'approved',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }));
    const pending = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      question: `Unanswered ${index + 1}`,
      occurrences: 1,
      resolved: false,
      created_at: '2026-01-01T00:00:00Z',
      last_seen_at: '2026-01-02T00:00:00Z',
    }));

    http.expectOne((req) => req.url.includes('/faq/inbox')).flush(pending);
    http.expectOne((req) => req.url.endsWith('/faq')).flush(faqs);
    http.expectOne((req) => req.url.endsWith('/documents')).flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-engine-facts')).toBeNull();

    TestBed.inject(RightSidebarService).showInfo();
    fixture.detectChanges();
    http
      .match((req) => req.url.endsWith('/language-model/settings'))
      .forEach((request) => request.flush(modelSettings()));
    http
      .match((req) => req.url.endsWith('/language-model/brain'))
      .forEach((request) => request.flush({ training: false, progress: null }));
    fixture.detectChanges();

    const facts = compiled.querySelector('.page-info-facts app-engine-facts');
    expect(facts?.querySelector('.engine-facts')?.getAttribute('aria-label')).toBe(
      'Training corpus state',
    );
    expect(Array.from(facts?.querySelectorAll('.fact dt') ?? []).map(text)).toEqual([
      'Trained answers',
      'Pending questions',
      'Corpus items',
    ]);
    expect(Array.from(facts?.querySelectorAll('.fact dd') ?? []).map(text)).toEqual([
      '12',
      '8',
      '20',
    ]);
    expect(facts?.textContent).toContain('trained + waiting');
    expect(compiled.querySelector('.trainer-content app-engine-facts')).toBeNull();
    http.verify();
  });

  it('keeps upload and refresh out of the trainer info panel', () => {
    const fixture = TestBed.createComponent(Trainer);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.includes('/faq/inbox')).flush([]);
    http.expectOne((req) => req.url.endsWith('/faq')).flush([]);
    http.expectOne((req) => req.url.endsWith('/documents')).flush([]);
    fixture.detectChanges();

    TestBed.inject(RightSidebarService).showInfo();
    fixture.detectChanges();
    http
      .match((req) => req.url.endsWith('/language-model/settings'))
      .forEach((request) => request.flush(modelSettings()));
    http
      .match((req) => req.url.endsWith('/language-model/brain'))
      .forEach((request) => request.flush({ training: false, progress: null }));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#right-sidebar .page-info-facts')).toBeTruthy();
    expect(compiled.querySelector('#right-sidebar .page-info-actions')).toBeNull();
    expect(compiled.querySelector('#right-sidebar button[aria-label="Refresh"]')).toBeNull();
    expect(compiled.querySelector('#right-sidebar input[type="file"]')).toBeNull();
    http.verify();
  });

  it('keeps the list compact and opens the full answer in the shared sidebar', () => {
    const fixture = TestBed.createComponent(Trainer);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.includes('/faq/inbox')).flush([]);
    http
      .expectOne((req) => req.url.endsWith('/faq'))
      .flush([
        {
          id: 4,
          question: 'How many vacation days do we get?',
          answer: 'Twenty days each year, plus public holidays.',
          status: 'approved',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      ]);
    http.expectOne((req) => req.url.endsWith('/documents')).flush([]);
    fixture.detectChanges();

    fixture.componentInstance.setTab('faqs');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.faq-row .q')?.textContent?.trim()).toBe(
      'How many vacation days do we get?',
    );
    expect(compiled.textContent).not.toContain('Twenty days each year');
    expect(compiled.querySelector('.right-sidebar')).toBeNull();

    compiled.querySelector<HTMLButtonElement>('.faq-row')?.click();
    fixture.detectChanges();

    http
      .expectOne((req) => req.url.endsWith('/language-model/brain'))
      .flush({ training: false, progress: null });
    fixture.detectChanges();

    expect(compiled.querySelector('.right-sidebar .faq-detail .a')?.textContent?.trim()).toBe(
      'Twenty days each year, plus public holidays.',
    );
    expect(compiled.querySelector('.faq-row .a')).toBeNull();
    http.verify();
  });

  it('asks for pending questions only and gives the inbox no resolved toggle', () => {
    const fixture = TestBed.createComponent(Trainer);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const inboxRequest = http.expectOne((req) => req.url.includes('/faq/inbox'));
    expect(inboxRequest.request.url).toContain('resolved=false');
    inboxRequest.flush([
      {
        id: 3,
        question: 'How do I request a laptop?',
        note: 'New answer: "Ask IT." — approved answer: "Use the portal."',
        occurrences: 2,
        resolved: false,
        created_at: '2026-01-01T00:00:00Z',
        last_seen_at: '2026-01-02T00:00:00Z',
      },
    ]);
    http.expectOne((req) => req.url.endsWith('/faq')).flush([]);
    http.expectOne((req) => req.url.endsWith('/documents')).flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.trainer-content .toolbar')).toBeNull();
    expect(compiled.textContent).not.toContain('Show answered');
    expect(compiled.textContent).not.toContain('pending ·');
    expect(Array.from(compiled.querySelectorAll('.trainer-content .card .q')).map(text)).toEqual([
      'How do I request a laptop?',
    ]);
    expect(compiled.querySelector('.trainer-content textarea')).toBeTruthy();
    expect(text(query(compiled, '.trainer-content .conflict-note'))).toBe(
      'New answer: "Ask IT." — approved answer: "Use the portal."',
    );
    http.verify();
  });

  it('puts the upload card first in the documents grid and uploads from it', () => {
    const fixture = TestBed.createComponent(Trainer);
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(DocumentsApiService);
    vi.spyOn(api, 'watchIngestJob').mockReturnValue(
      of(
        ingestJob({
          status: 'done',
          step: 'Finished',
          progress: 1,
          done: 2,
          total: 2,
          chunks: 2,
          duplicates: { stored: 2, exact: 0, near: 0 },
        }),
      ),
    );
    fixture.detectChanges();

    http.expectOne((req) => req.url.includes('/faq/inbox')).flush([]);
    http.expectOne((req) => req.url.endsWith('/faq')).flush([]);
    http
      .expectOne((req) => req.url.endsWith('/documents'))
      .flush([{ source: 'handbook.pdf', chunks: 12 }]);
    fixture.detectChanges();

    fixture.componentInstance.setTab('documents');
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/ingest/jobs')).flush([]);

    const compiled = fixture.nativeElement as HTMLElement;
    const grid = query(compiled, '.documents-grid');
    const cards = Array.from(grid.querySelectorAll('.doc-card'));
    expect(cards.map((card) => card.classList.contains('upload-card'))).toEqual([true, false]);
    expect(text(query(cards[0], '.doc-name'))).toBe('Upload a document');
    expect(text(query(cards[0], '.doc-meta'))).toBe('csv, xlsx, docx, doc, pdf, txt');
    expect(text(query(cards[1], '.doc-name'))).toBe('handbook.pdf');
    expect(text(query(cards[1], '.doc-meta'))).toBe('12 chunks');
    expect(compiled.querySelector('.empty')).toBeNull();

    const input = query(cards[0], 'input[type=file]') as HTMLInputElement;
    expect(input.accept).toBe('.csv,.xlsx,.xls,.docx,.doc,.pdf,.txt');
    expect(input.getAttribute('aria-label')).toBe('Upload a document');

    const file = new File(['name,role'], 'people.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(text(query(cards[0], '.doc-name'))).toBe('Indexing…');
    expect(text(query(cards[0], '.doc-meta'))).toBe('Waiting to start');
    expect(input.disabled).toBe(true);

    const upload = http.expectOne((req) => req.url.endsWith('/upload'));
    expect(upload.request.method).toBe('POST');
    const sent = (upload.request.body as FormData).get('file') as File;
    expect(sent.name).toBe('people.csv');
    expect(sent.size).toBe(file.size);
    upload.flush({ job_id: 7, source: 'people.csv', status: 'queued' });
    http
      .expectOne((req) => req.url.endsWith('/documents'))
      .flush([
        { source: 'people.csv', chunks: 2 },
        { source: 'handbook.pdf', chunks: 12 },
      ]);
    fixture.detectChanges();

    const refreshed = Array.from(grid.querySelectorAll('.doc-card'));
    expect(refreshed).toHaveLength(4);
    expect(text(query(refreshed[0], '.doc-name'))).toBe('Upload a document');
    expect(text(query(refreshed[1], '.doc-name'))).toBe('people.csv');
    expect(text(query(refreshed[1], '.doc-meta'))).toBe('2 passages stored');
    expect(input.disabled).toBe(false);
    http.verify();
  });

  it('restores a running read, stops it and retries it', () => {
    const fixture = TestBed.createComponent(Trainer);
    const http = TestBed.inject(HttpTestingController);
    const api = TestBed.inject(DocumentsApiService);
    const streams: Subject<IngestJob>[] = [];
    vi.spyOn(api, 'watchIngestJob').mockImplementation(() => {
      const stream = new Subject<IngestJob>();
      streams.push(stream);
      return stream.asObservable();
    });
    fixture.detectChanges();

    http.expectOne((req) => req.url.includes('/faq/inbox')).flush([]);
    http.expectOne((req) => req.url.endsWith('/faq')).flush([]);
    http.expectOne((req) => req.url.endsWith('/documents')).flush([]);
    fixture.componentInstance.setTab('documents');
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/ingest/jobs'))
      .flush([
        ingestJob({
          status: 'running',
          step: 'Storing the passages',
          progress: 0.5,
          done: 8,
          total: 16,
        }),
      ]);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = query(compiled, '.job-card');
    expect(text(query(card, '.doc-meta'))).toBe('Storing the passages · 8/16 passages');
    const bar = query(card, '.job-progress');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');

    (query(card, 'button[aria-label="Stop indexing the file"]') as HTMLButtonElement).click();
    const cancel = http.expectOne((req) => req.url.endsWith('/ingest/jobs/7/cancel'));
    expect(cancel.request.method).toBe('POST');
    cancel.flush(ingestJob({ status: 'cancelled', step: 'Stopped by the trainer.' }));
    streams[0].next(ingestJob({ status: 'cancelled', step: 'Stopped by the trainer.' }));
    streams[0].complete();
    fixture.detectChanges();

    expect(text(query(compiled, '.job-card .doc-meta'))).toBe('Stopped before it finished.');

    (query(compiled, 'button[aria-label="Retry indexing the file"]') as HTMLButtonElement).click();
    const retry = http.expectOne((req) => req.url.endsWith('/ingest/jobs/7/retry'));
    expect(retry.request.method).toBe('POST');
    retry.flush(ingestJob({ status: 'queued' }));
    fixture.detectChanges();
    expect(text(query(compiled, '.job-card .doc-meta'))).toBe('Waiting to start');
    expect((query(compiled, 'input[type=file]') as HTMLInputElement).disabled).toBe(true);
    http.verify();
  });
});
