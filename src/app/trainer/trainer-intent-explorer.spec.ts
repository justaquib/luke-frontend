import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Trainer } from './trainer';

describe('Trainer intent groups', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trainer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('shows an existing intent group in the merge view', () => {
    const fixture = TestBed.createComponent(Trainer);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.includes('/faq/inbox')).flush([]);
    http
      .expectOne((req) => req.url.endsWith('/faq'))
      .flush([
        {
          id: 1,
          question: 'How many vacation days do we get?',
          answer: 'Twenty days each year.',
          status: 'approved',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
        {
          id: 2,
          question: 'How much holiday do I have?',
          answer: 'Twenty days each year.',
          status: 'pending',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
        },
      ]);
    http.expectOne((req) => req.url.endsWith('/documents')).flush([]);
    fixture.detectChanges();

    fixture.componentInstance.setTab('merge');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const group = compiled.querySelector('.intent-group-card');
    expect(group?.querySelector('.q')?.textContent?.trim()).toBe(
      'How many vacation days do we get?',
    );
    expect(
      Array.from(group?.querySelectorAll('.alias-list li .alias-q') ?? []).map((node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['How much holiday do I have?']);
    http.verify();
  });
});
