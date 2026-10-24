import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesignService } from '../core/design.service';
import { AppSidebar } from './app-sidebar';
import { BackgroundTasksService } from './background-tasks.service';

describe('AppSidebar', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppSidebar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(BackgroundTasksService).stop();
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('data-sidebar-side');
    root.removeAttribute('data-sidebar-mode');
  });

  it('offers the workspace views of every dashboard page', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const links = [...compiled.querySelectorAll('a.nav-item')].map((link) =>
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
  });

  it('uses the same drawn icons as the other sidebars', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const items = [...compiled.querySelectorAll('a.nav-item')];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.querySelector('.nav-icon svg')).toBeTruthy();
    }
  });

  it('folds to the rail when the shared frame closes the navigation', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const design = TestBed.inject(DesignService);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.nav-label')).toBeTruthy();

    design.closeSidebar();
    fixture.detectChanges();

    expect(compiled.classList.contains('rail')).toBe(true);
    expect(compiled.querySelector('.nav-label')).toBeNull();

    design.toggleSidebar();
    fixture.detectChanges();

    expect(compiled.querySelector('.nav-label')).toBeTruthy();
  });

  it('keeps a running background task at the bottom while the sidebar is open', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(BackgroundTasksService).start();
    http
      .expectOne((req) => req.url.endsWith('/language-model/brain'))
      .flush({
        training: true,
        progress: {
          steps_done: 5,
          steps_total: 10,
          eta_seconds: 30,
          stages: [{ key: 'write', label: 'Writing the material', status: 'working' }],
        },
      });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const strip = compiled.querySelector('.task-strip');
    expect(strip?.textContent).toContain('Training the neural brain');
    expect(strip?.textContent).toContain('5 of 10 steps');
    expect(strip?.querySelector('.task-share')?.textContent?.trim()).toBe('50%');
    expect(strip?.querySelector('.task-meter')?.getAttribute('role')).toBe('progressbar');
    expect(strip?.querySelector('.task-meter')?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('switches sidebar behaviour and side from the footer', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const design = TestBed.inject(DesignService);
    const compiled = fixture.nativeElement as HTMLElement;
    const root = document.documentElement;

    const float = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Float the sidebar over the page"]',
    );
    float?.click();
    fixture.detectChanges();

    expect(design.sidebarMode()).toBe('overlay');
    expect(root.getAttribute('data-sidebar-mode')).toBe('overlay');
    expect(float?.getAttribute('aria-pressed')).toBe('true');

    const right = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Open the sidebar on the right"]',
    );
    right?.click();
    fixture.detectChanges();

    expect(design.sidebarSide()).toBe('right');
    expect(root.getAttribute('data-sidebar-side')).toBe('right');
    expect(right?.getAttribute('aria-pressed')).toBe('true');
  });
});
