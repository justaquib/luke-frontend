import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Settings } from './settings';

describe('Settings', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('shows what the store holds', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/language-model/store')).flush({
      documents: [{ source: 'notes.pdf', chunks: 12 }],
      totals: { files: 1, chunks: 12, answers: 4, pending: 2, lessons: 30, vocabulary: 900 },
      model: { name: 'Tiny Word Trigram', level: 0.5, title: 'Luke 0.5', vocabulary: 900, parameters: 1024, trained: true },
      disk: { learner_bytes: 2048, vector_store_bytes: 4096, uploads_bytes: 512 },
    });
    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#settings-store-title')).toBeTruthy();
    expect(compiled.textContent).toContain('notes.pdf');
    expect(compiled.textContent).toContain('12');
    expect(compiled.querySelector('.store-metric')).toBeTruthy();
    http.verify();
  });
});
