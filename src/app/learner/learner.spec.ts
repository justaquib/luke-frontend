import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Learner } from './learner';
import { duplicateCard, duplicates, learnerState } from './learner-test-data';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

describe('Learner', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Learner],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  function flushState(
    http: HttpTestingController,
    cards: unknown[] = [],
    overrides: Record<string, unknown> = {},
  ): void {
    http
      .expectOne((req) => req.url.endsWith('/language-model/state'))
      .flush(learnerState(cards, overrides));
    http
      .expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates'))
      .flush(duplicates);
  }

  it('leads with the tabs and keeps search inside the knowledge tab', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const page = compiled.querySelector('.language-learning-page');
    expect(compiled.querySelector('.learner-summary')).toBeNull();
    expect(compiled.querySelector('.language-model-intro')).toBeNull();
    expect(page?.firstElementChild?.classList.contains('learner-tabs')).toBe(true);
    expect(compiled.querySelector('.learner-search-card')).toBeNull();

    compiled.querySelector<HTMLButtonElement>('#learner-tab-knowledge')?.click();
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.learner-search-card')).toBeTruthy();
    expect(compiled.querySelector('.grade-browser')).toBeNull();
    expect(compiled.querySelector('.learned-metrics')).toBeNull();
    expect(compiled.querySelector('.number-knowledge-card')).toBeNull();
    http.verify();
  });

  it('shows one knowledge panel at a time and re-reads the material on every switch', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http, [], { example_total: 4 });
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('#learner-tab-knowledge')?.click();
    fixture.detectChanges();
    flushState(http, [], { example_total: 7 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.learner-search-card')).toBeTruthy();
    expect(compiled.querySelector('.grade-browser')).toBeNull();

    compiled.querySelector<HTMLButtonElement>('#knowledge-tab-grades')?.click();
    fixture.detectChanges();
    flushState(http, [], { example_total: 8 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.learner-search-card')).toBeNull();
    expect(compiled.querySelector('.grade-browser')).toBeTruthy();
    expect(compiled.querySelector('.learned-metrics')).toBeNull();

    compiled.querySelector<HTMLButtonElement>('#knowledge-tab-learned')?.click();
    fixture.detectChanges();
    flushState(http, [], { example_total: 9 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.learner-search-card')).toBeNull();
    expect(compiled.querySelector('.grade-browser')).toBeNull();
    const metrics = [...compiled.querySelectorAll('.learned-metrics > div')].map((row) => [
      row.querySelector('dt')?.textContent?.trim(),
      row.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(metrics).toEqual([
      ['Questions held', '12'],
      ['Your lessons', '0'],
      ['Word meanings', '0'],
      ['Trainer answers', '0'],
      ['Sentence examples', '9'],
    ]);
    http.verify();
  });

  it('re-reads what it has learned every time, so the numbers are never static', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http, [], { example_total: 0 });
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('#learner-tab-knowledge')?.click();
    fixture.detectChanges();

    // Opening "What it knows" asks for the saved material again; the second
    // read is newer than the first, and the page must show the newer numbers.
    flushState(http, [duplicateCard], {
      example_total: 31,
      examples: [{ kind: 'foundation', text: 'A magnet pulls iron.' }],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    compiled.querySelector<HTMLButtonElement>('#knowledge-tab-learned')?.click();
    fixture.detectChanges();
    flushState(http, [duplicateCard], {
      example_total: 42,
      examples: [{ kind: 'foundation', text: 'A magnet pulls iron.' }],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const metrics = [...compiled.querySelectorAll('.learned-metrics > div')].map((row) => [
      row.querySelector('dt')?.textContent?.trim(),
      row.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(metrics).toEqual([
      ['Questions held', '12'],
      ['Your lessons', '1'],
      ['Word meanings', '0'],
      ['Trainer answers', '0'],
      ['Sentence examples', '42'],
    ]);
    expect(compiled.querySelector('.language-summary-note')).toBeNull();
    expect(compiled.querySelector('.learned-note')?.textContent).toContain('first 1 of 42');
    expect(compiled.querySelector('#knowledge-tab-grades small')?.textContent?.trim()).toBe('1');
    expect(compiled.querySelector('#knowledge-tab-learned small')?.textContent?.trim()).toBe('1');

    compiled.querySelector<HTMLButtonElement>('app-top-bar .details-btn')?.click();
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/language-model/brain'))
      .flush({ training: false, progress: null });
    fixture.detectChanges();

    expect(compiled.querySelector('.learner-details-stats')?.textContent).toContain('42');
    http.verify();
  });

  it('folds the explanation of every card behind an info button', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as unknown as {
      learnerTab: { set: (value: string) => void };
      knowledgeTab: { set: (value: string) => void };
    };
    const panels: Array<{ tab: string; knowledge?: string }> = [
      { tab: 'overview' },
      { tab: 'lessons' },
      { tab: 'tests' },
      { tab: 'knowledge', knowledge: 'search' },
      { tab: 'knowledge', knowledge: 'grades' },
      { tab: 'knowledge', knowledge: 'learned' },
      { tab: 'expressions' },
    ];
    for (const panel of panels) {
      component.learnerTab.set(panel.tab);
      if (panel.knowledge) component.knowledgeTab.set(panel.knowledge);
      fixture.detectChanges();

      const cards = [...compiled.querySelectorAll('.language-learning-card')];
      expect(cards.length, panel.tab).toBeGreaterThan(0);
      for (const card of cards) {
        expect(card.querySelector('.card-info-button'), panel.tab).toBeTruthy();
        expect(card.querySelector('.card-info-text'), panel.tab).toBeNull();
      }
    }
    http.verify();
  });

  it('opens the explanation of a card in the shared dialog only when its info button is used', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      learnerTab: { set: (value: string) => void };
      knowledgeTab: { set: (value: string) => void };
    };
    component.learnerTab.set('knowledge');
    component.knowledgeTab.set('learned');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const card = query<HTMLElement>(compiled, '.learned-examples');
    const button = query<HTMLButtonElement>(card, '.card-info-button');
    expect(button.getAttribute('aria-label')).toBe('Show info about what it has learned');
    expect(card.querySelector('.card-info-text')).toBeNull();

    button.click();
    fixture.detectChanges();

    expect(query<HTMLElement>(card, '[role="dialog"] .card-info-text').textContent).toContain(
      'Everything the learner holds right now',
    );
    expect(query<HTMLElement>(card, '[role="dialog"] h2').textContent?.trim()).toBe(
      'About what it has learned',
    );
    expect(button.getAttribute('aria-label')).toBe('Show info about what it has learned');
    http.verify();
  });

  it('folds the shared navigation away when the toggle is used', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector<HTMLButtonElement>('app-top-bar .nav-btn');
    toggle?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('app-shell')?.classList.contains('sidebar-closed')).toBe(true);
    expect(compiled.querySelector('app-sidebar .nav-label')).toBeNull();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-label')).toBe('Open the navigation');

    toggle?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('app-shell')?.classList.contains('sidebar-closed')).toBe(false);
    expect(compiled.querySelector('app-sidebar .nav-label')).toBeTruthy();
    http.verify();
  });

  it('adds a lesson without checking for duplicates first', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      lessonQuestionDraft: { set: (value: string) => void };
      lessonAnswerDraft: { set: (value: string) => void };
      learnerTab: { set: (value: string) => void };
    };
    component.learnerTab.set('lessons');
    component.lessonQuestionDraft.set('What is a magnet?');
    component.lessonAnswerDraft.set('A magnet pulls iron.');

    fixture.componentInstance.teachLanguageModel();
    await fixture.whenStable();

    // The lesson is taught straight away: nothing is checked first.
    http.expectNone((req) => req.url.endsWith('/language-model/lessons/check'));
    const taught = http.expectOne((req) => req.url.endsWith('/language-model/lessons'));
    expect(taught.request.body.lesson).toContain('What is a magnet?');
    taught.flush({ ...learnerState([duplicateCard]), added_lessons: 1 });
    http
      .expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates'))
      .flush(duplicates);
    await fixture.whenStable();
    fixture.detectChanges();
    http.verify();
  });

  it('teaches a story as one passage with the name it was given', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      lessonEntryMode: { set: (value: string) => void };
      lessonTitleDraft: { set: (value: string) => void };
      lessonPassageDraft: { set: (value: string) => void };
    };
    component.lessonEntryMode.set('story');
    component.lessonTitleDraft.set('The Cat on the Mat');
    component.lessonPassageDraft.set('The cat sat on the mat. It was a warm afternoon.');

    fixture.componentInstance.teachLanguageModel();
    await fixture.whenStable();

    const taught = http.expectOne((req) => req.url.endsWith('/language-model/lessons'));
    expect(taught.request.body.kind).toBe('story');
    expect(taught.request.body.title).toBe('The Cat on the Mat');
    expect(taught.request.body.lesson).toContain('The cat sat on the mat.');
    taught.flush({ ...learnerState([duplicateCard]), added_lessons: 1 });
    http
      .expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates'))
      .flush(duplicates);
    await fixture.whenStable();
    fixture.detectChanges();
    http.verify();
  });

  it('counts the questions and the duplicates and marks the repeats', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http, [duplicateCard]);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      learnerTab: { set: (value: string) => void };
      knowledgeTab: { set: (value: string) => void };
    };
    component.learnerTab.set('knowledge');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.grade-qa-button');
    expect(badge?.textContent?.trim()).toBe('12 questions · 1 duplicate');

    component.knowledgeTab.set('grades');
    fixture.detectChanges();
    expect(compiled.querySelector('.duplicate-badge')?.textContent?.trim()).toBe('D');
    http.verify();
  });
});
