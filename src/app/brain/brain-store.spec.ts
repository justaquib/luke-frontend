import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BrainStore } from './brain-store';

describe('BrainStore', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrainStore],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('reads the store the training reads and shows every measurement', async () => {
    const fixture = TestBed.createComponent(BrainStore);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne((req) => req.url.endsWith('/language-model/store'))
      .flush({
        documents: [{ source: 'notes.pdf', chunks: 12 }],
        totals: { files: 1, chunks: 12, answers: 4, pending: 2, lessons: 30, vocabulary: 900 },
        model: {
          name: 'Neural Word Model',
          level: 0.5,
          title: 'Luke 0.5',
          vocabulary: 900,
          parameters: 1024,
          trained: true,
          steps: 300,
          loss: 4.1,
          corpus_sentences: 3200,
          corpus_tokens: 48000,
        },
        disk: { learner_bytes: 2048, vector_store_bytes: 4096, uploads_bytes: 512 },
      });
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#brain-store-title')?.textContent?.trim()).toBe('Knowledge');
    expect(compiled.textContent).toContain('notes.pdf');
    expect(compiled.textContent).toContain('12');
    expect(compiled.textContent).toContain('training loss 4.100');
    expect(compiled.querySelectorAll('.store-metric').length).toBe(6);
    expect(compiled.querySelector('button[aria-label="Refresh the knowledge"]')).toBeTruthy();
    http.verify();
  });
});
