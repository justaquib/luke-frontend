import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Trainer } from './trainer';

function text(node: Element): string {
  return node.textContent?.trim() ?? '';
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

  it('shows the corpus state as measured facts above the tabs', () => {
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

    const facts = (fixture.nativeElement as HTMLElement).querySelector('app-engine-facts');
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
});
