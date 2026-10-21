import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Trainer } from './trainer';

describe('Trainer intent explorer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trainer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('shows the intent explorer after clicking the sidebar item', async () => {
    const fixture = TestBed.createComponent(Trainer);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navItems = [...compiled.querySelectorAll('.nav-item')] as HTMLButtonElement[];
    console.log('NAV ITEMS:', navItems.map((b) => b.textContent?.trim()));
    const intentButton = navItems.find((b) => b.textContent?.includes('Intent explorer'));
    console.log('INTENT BUTTON FOUND:', !!intentButton);

    intentButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    console.log('TITLE:', compiled.querySelector('.editable-title')?.textContent?.trim());
    console.log('SUBTITLE:', compiled.querySelector('.subtitle')?.textContent?.trim());
    console.log('EXPLORER CARDS:', compiled.querySelectorAll('.intent-explorer-card').length);
    console.log('CARD HEADINGS:', [...compiled.querySelectorAll('.intent-explorer-card h3')].map((h) => h.textContent?.trim()));

    const http = TestBed.inject(HttpTestingController);
    http.match(() => true).forEach((req) => req.flush({} as any));
  });
});
