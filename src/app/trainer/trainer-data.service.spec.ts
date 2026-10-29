import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth.service';
import { TrainerDataService } from './trainer-data.service';
import { TrainerStore } from './trainer.store';

const UNREADABLE = 'The questions are stored away for now.';

/** Fails the newest read whose URL matches, with the backend's own reason. */
function refuse(http: HttpTestingController, match: (url: string) => boolean): void {
  http
    .expectOne((req) => match(req.url))
    .flush({ detail: UNREADABLE }, { status: 503, statusText: 'Unavailable' });
}

/**
 * The trainer reads the corpus when the page opens and after every write. A read
 * that failed is the one moment the page has no counts, so the store must hold the
 * reason instead of leaving the panels to report the empty lists as a fact.
 */
describe('TrainerDataService readings', () => {
  let http: HttpTestingController;
  let store: TrainerStore;
  let data: TrainerDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => 'test-token' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(TrainerStore);
    data = TestBed.inject(TrainerDataService);
  });

  afterEach(() => {
    http.verify();
  });

  it('keeps a failed corpus reading apart from an empty corpus', () => {
    data.refresh();
    refuse(http, (url) => url.includes('/faq/inbox'));
    refuse(http, (url) => url.endsWith('/faq'));

    expect(store.corpusError()).toBe(UNREADABLE);
    expect(store.engineFacts().map((fact) => fact.value)).toEqual([
      'not read',
      'not read',
      'not read',
    ]);
    expect(store.statusCountText()).toEqual({
      all: '—',
      pending: '—',
      approved: '—',
      declined: '—',
      duplicate: '—',
    });
  });

  it('lets a successful re-reading replace the failure with counts', () => {
    data.refresh();
    refuse(http, (url) => url.includes('/faq/inbox'));
    refuse(http, (url) => url.endsWith('/faq'));
    expect(store.corpusError()).toBe(UNREADABLE);

    data.refresh();
    http
      .expectOne((req) => req.url.includes('/faq/inbox'))
      .flush([{ id: 3, question: 'How do I request a laptop?', occurrences: 1 }]);
    http
      .expectOne((req) => req.url.endsWith('/faq'))
      .flush([
        {
          id: 4,
          question: 'How many vacation days do we get?',
          answer: 'Twenty days each year.',
          status: 'approved',
        },
      ]);

    expect(store.corpusError()).toBeNull();
    expect(store.engineFacts().map((fact) => fact.value)).toEqual(['1', '1', '2']);
    expect(store.statusCountText().all).toBe('1');
  });

  it('names the document list that did not come back', () => {
    data.refreshDocuments();
    refuse(http, (url) => url.endsWith('/documents'));

    expect(store.documentsError()).toBe(UNREADABLE);
    expect(store.corpusError()).toBeNull();
  });
});
