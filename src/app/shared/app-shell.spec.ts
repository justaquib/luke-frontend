import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DesignService } from '../core/design.service';
import { AppShell } from './app-shell';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

describe('AppShell', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('data-sidebar-side');
    root.removeAttribute('data-sidebar-mode');
  });

  function render(): { fixture: ComponentFixture<AppShell>; compiled: HTMLElement } {
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  }

  it('keeps one shared toggle per sidebar in the top panel', () => {
    const { compiled } = render();
    const toggle = query<HTMLButtonElement>(compiled, 'app-top-bar .nav-btn');
    const details = query<HTMLButtonElement>(compiled, 'app-top-bar .details-btn');

    expect(compiled.querySelector('app-sidebar .sidebar-toggle')).toBeNull();
    expect(toggle.getAttribute('aria-controls')).toBe('app-sidebar');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Close the navigation');
    expect(details.getAttribute('aria-controls')).toBe('right-sidebar');
    expect(details.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes and reopens the navigation from the top panel', () => {
    const design = TestBed.inject(DesignService);
    const { fixture, compiled } = render();
    const button = query<HTMLButtonElement>(compiled, 'app-top-bar .nav-btn');

    button.click();
    fixture.detectChanges();

    expect(design.sidebarOpen()).toBe(false);
    expect(compiled.classList.contains('sidebar-closed')).toBe(true);
    expect(compiled.querySelector('app-sidebar .nav-label')).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Open the navigation');

    button.click();
    fixture.detectChanges();

    expect(design.sidebarOpen()).toBe(true);
    expect(compiled.querySelector('app-sidebar .nav-label')).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
});
