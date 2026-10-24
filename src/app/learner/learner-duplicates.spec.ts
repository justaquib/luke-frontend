import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Learner } from './learner';
import { duplicateCard, duplicates, learnerState } from './learner-test-data';

interface OpenedSearch {
  compiled: HTMLElement;
  http: HttpTestingController;
  fixture: ComponentFixture<Learner>;
}

describe('Learner duplicate review', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Learner],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  function flushState(http: HttpTestingController, cards: unknown[] = []): void {
    http.expectOne((req) => req.url.endsWith('/language-model/state')).flush(learnerState(cards));
    http
      .expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates'))
      .flush(duplicates);
  }

  async function openSearch(): Promise<OpenedSearch> {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http, [duplicateCard]);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      learnerTab: { set: (value: string) => void };
    };
    component.learnerTab.set('knowledge');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.grade-qa-button')?.click();
    http
      .expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates'))
      .flush(duplicates);
    await fixture.whenStable();
    fixture.detectChanges();
    return { compiled, http, fixture };
  }

  it('keeps both lessons of a group when the trainer accepts both', async () => {
    const { compiled, http, fixture } = await openSearch();

    const acceptBoth = [
      ...compiled.querySelectorAll<HTMLButtonElement>('.duplicate-group > header button'),
    ].find((button) => button.getAttribute('aria-label') === 'Accept both questions as separate');
    expect(acceptBoth).toBeTruthy();

    acceptBoth?.click();
    const accepted = http.expectOne((req) =>
      req.url.endsWith('/language-model/lessons/duplicates/accept'),
    );
    expect(accepted.request.body.key).toBe('question:what is a magnet?');
    accepted.flush(learnerState([duplicateCard]));
    http
      .expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates'))
      .flush({
        ...duplicates,
        groups: [],
        duplicate_count: 0,
      });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.duplicate-group')).toBeNull();
    http.verify();
  });

  it('opens the duplicates panel with the choices for every lesson', async () => {
    const { compiled, http } = await openSearch();

    const panel = compiled.querySelector('.duplicate-panel');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain('What is a magnet?');
    const cards = [...(panel?.querySelectorAll('.duplicate-card') ?? [])];
    expect(cards.length).toBe(2);
    for (const card of cards) {
      const actions = [...card.querySelectorAll('.duplicate-card-actions button')].map((button) =>
        button.getAttribute('aria-label'),
      );
      expect(actions).toEqual([
        'Accept this question',
        'Improve the question or answer',
        'Change the topic',
        'Remove this duplicate',
      ]);
    }
    http.verify();
  });
});
