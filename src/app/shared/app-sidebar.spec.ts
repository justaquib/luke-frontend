import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppSidebar } from './app-sidebar';

describe('AppSidebar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebar],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('offers the workspace views of every dashboard page', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const links = [...compiled.querySelectorAll('a.nav-item')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/chat', '/trainer', '/learner', '/brain', '/settings']);
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

  it('hides the labels when the sidebar is folded away', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.nav-label')).toBeNull();
    expect(compiled.querySelector('.brand-name')).toBeNull();
  });

  it('asks the page to fold the sidebar away', async () => {
    const fixture = TestBed.createComponent(AppSidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    let toggled = false;
    fixture.componentInstance.toggled.subscribe(() => (toggled = true));
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.sidebar-toggle')?.click();

    expect(toggled).toBe(true);
  });
});
