import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Learner } from './learner';
import { duplicates, learnerState } from './learner-test-data';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

function text(root: ParentNode, selector: string): string {
  return query<HTMLElement>(root, selector).textContent?.trim() ?? '';
}

describe('Learner shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Learner],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  function flushState(http: HttpTestingController): void {
    http.expectOne((req) => req.url.endsWith('/language-model/state')).flush(learnerState());
    http
      .expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates'))
      .flush(duplicates);
  }

  async function render(): Promise<{
    fixture: ReturnType<typeof TestBed.createComponent<Learner>>;
    compiled: HTMLElement;
    http: HttpTestingController;
  }> {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement, http };
  }

  it('shows the shared frame, the same as the other dashboard pages', async () => {
    const { compiled, http } = await render();
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-page-header')).toBeNull();
    expect(compiled.querySelector('.learner-tabs')).toBeTruthy();

    const links = [...compiled.querySelectorAll('app-sidebar a.nav-item')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).toEqual([
      '/chat',
      '/dashboard/trainer',
      '/dashboard/parenting',
      '/dashboard/learner',
      '/dashboard/brain',
      '/dashboard/design',
      '/dashboard/settings',
    ]);
    http.verify();
  });

  it('keeps the learner summary and about text in the details panel', async () => {
    const { fixture, compiled, http } = await render();
    expect(compiled.querySelector('.learner-summary')).toBeNull();
    expect(compiled.querySelector('.right-sidebar')).toBeNull();

    query<HTMLButtonElement>(compiled, 'app-top-bar .details-btn').click();
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/language-model/brain'))
      .flush({ training: false, progress: null });
    fixture.detectChanges();

    const panel = query<HTMLElement>(compiled, '.right-sidebar');
    expect(text(panel, '#right-sidebar-title')).toBe('Language Learner');
    expect(text(panel, '.sidebar-subtitle')).toBe('Neural Word Model · Nursery');
    expect(text(panel, '.learner-details-line')).toContain('Current grade');
    expect(text(panel, '.learner-details-line')).toContain('24 words known');
    expect(text(panel, '.learner-details-stats')).toContain('12');
    expect(text(panel, '.learner-details-about')).toContain('About this learner');
    expect(text(panel, '.learner-details-about')).toContain('A small learner.');
    expect(compiled.querySelector('.learner-about')).toBeNull();
    expect(panel.querySelector('.learner-details-refresh')).toBeTruthy();
    http.verify();
  });
});
