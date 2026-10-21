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
    expect(compiled.querySelector('.merge-search-card h3')?.textContent?.trim()).toBe('Find related questions to merge');
  });
});
