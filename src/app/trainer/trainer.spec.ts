import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Trainer } from './trainer';

describe('Trainer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trainer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('renders the intent explorer for the intents tab', async () => {
    const fixture = TestBed.createComponent(Trainer);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.setTab('intents');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.intent-explorer')).toBeTruthy();
    expect(compiled.querySelector('.intent-search input')).toBeTruthy();
    expect(compiled.querySelector('.intent-map')).toBeTruthy();
    expect(compiled.querySelector('.intent-answer-card')).toBeTruthy();
    expect(compiled.querySelector('.intent-map-heading h2')?.textContent?.trim()).toBe('Intent map');
  });
});
