import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DesignService } from '../core/design.service';
import { AppTopBar } from './app-top-bar';
import { PageInfoService } from './page-info.service';
import { RightSidebarService } from './right-sidebar.service';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

describe('AppTopBar', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppTopBar],
      providers: [provideRouter([{ path: 'dashboard/brain', children: [] }])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('data-sidebar-side');
    root.removeAttribute('data-sidebar-mode');
  });

  function render(): { fixture: ComponentFixture<AppTopBar>; compiled: HTMLElement } {
    const fixture = TestBed.createComponent(AppTopBar);
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  }

  it('holds the brand and navigation on the left and the three page controls on the right', () => {
    const { compiled } = render();
    const brand = query<HTMLAnchorElement>(compiled, '.top-bar .brand');
    const nav = query<HTMLButtonElement>(compiled, '.top-bar .nav-btn');
    const controls = compiled.querySelectorAll('.top-bar .bar-end .frame-btn');
    const info = query<HTMLButtonElement>(compiled, '.top-bar .info-btn');
    const settings = query<HTMLAnchorElement>(compiled, '.top-bar .settings-btn');
    const details = query<HTMLButtonElement>(compiled, '.top-bar .details-btn');

    expect(brand.getAttribute('href')).toBe('/chat');
    expect(brand.textContent).toContain('Luke');
    expect(nav.getAttribute('aria-controls')).toBe('app-sidebar');
    expect(nav.getAttribute('aria-label')).toBe('Close the navigation');
    expect([...controls].map((control) => control.classList[1])).toEqual([
      'info-btn',
      'settings-btn',
      'details-btn',
    ]);
    expect(info.getAttribute('aria-controls')).toBe('right-sidebar');
    expect(info.getAttribute('aria-label')).toBe('Open the info panel');
    expect(settings.getAttribute('href')).toBe('/dashboard/settings');
    expect(settings.getAttribute('aria-label')).toBe('Open settings');
    expect(settings.getAttribute('aria-current')).toBeNull();
    expect(details.getAttribute('aria-controls')).toBe('right-sidebar');
    expect(details.getAttribute('aria-label')).toBe('Open the info panel');
  });

  it('names the page and its scope in the middle', async () => {
    await TestBed.inject(Router).navigateByUrl('/dashboard/brain');
    const { compiled } = render();
    const center = query<HTMLElement>(compiled, '.top-bar .bar-center');

    expect(query(center, '.page-name').textContent?.trim()).toBe('Luke brain');
    expect(query(center, '.page-scope').textContent?.trim()).toBe('Model builder');
    expect(query(center, '.page-dot').getAttribute('aria-hidden')).toBe('true');
    expect(center.textContent).not.toContain('What the brain');
  });

  it('shows the page context title and renames it in place', async () => {
    const renames: string[] = [];
    TestBed.inject(PageInfoService).setContextTitle({
      title: 'Why the sky is blue',
      rename: (title) => renames.push(title),
    });
    const { fixture, compiled } = render();
    const center = query<HTMLElement>(compiled, '.top-bar .bar-center');
    const trigger = query<HTMLButtonElement>(center, '.context-title');

    expect(query(center, '.context-divider').getAttribute('aria-hidden')).toBe('true');
    expect(trigger.textContent).toContain('Why the sky is blue');
    expect(trigger.getAttribute('aria-label')).toBe('Rename conversation: Why the sky is blue');

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const input = query<HTMLInputElement>(center, '.context-title-input');
    input.value = 'Sky colour';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(renames).toEqual(['Sky colour']);
    expect(center.querySelector('.context-title-input')).toBeNull();
    expect(query(center, '.context-title').textContent).toContain('Why the sky is blue');
  });

  it('opens the page information from the right', () => {
    const sidebar = TestBed.inject(RightSidebarService);
    const { fixture, compiled } = render();
    const info = query<HTMLButtonElement>(compiled, '.top-bar .info-btn');

    info.click();
    fixture.detectChanges();

    expect(sidebar.isOpen()).toBe(true);
    expect(sidebar.info()).toBe(true);
    expect(info.getAttribute('aria-expanded')).toBe('true');
    expect(info.getAttribute('aria-label')).toBe('Close the info panel');
  });

  it('closes and reopens the navigation from the top panel', () => {
    const design = TestBed.inject(DesignService);
    const { fixture, compiled } = render();
    const button = query<HTMLButtonElement>(compiled, '.top-bar .nav-btn');

    button.click();
    fixture.detectChanges();

    expect(design.sidebarOpen()).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Open the navigation');

    button.click();
    fixture.detectChanges();

    expect(design.sidebarOpen()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens the right panel from the top panel', () => {
    const sidebar = TestBed.inject(RightSidebarService);
    const { fixture, compiled } = render();
    const button = query<HTMLButtonElement>(compiled, '.top-bar .details-btn');

    button.click();
    fixture.detectChanges();

    expect(sidebar.isOpen()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Close the info panel');
  });
});
