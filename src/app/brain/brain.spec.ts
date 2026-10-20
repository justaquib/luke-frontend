import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Brain } from './brain';

describe('Brain', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Brain],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('renders the 3d brain with knowledge nodes', async () => {
    const fixture = TestBed.createComponent(Brain);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brain-model')).toBeTruthy();
    expect(compiled.querySelectorAll('.brain-node').length).toBe(40);
    // The level card falls back to a placeholder until the model answers.
    expect(compiled.querySelector('.brain-readout h2')?.textContent?.trim()).toBeTruthy();
  });
});
