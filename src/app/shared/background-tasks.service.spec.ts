import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BackgroundTasksService } from './background-tasks.service';

const brainState = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  training: false,
  progress: null,
  ...overrides,
});

describe('BackgroundTasksService', () => {
  let tasks: BackgroundTasksService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    tasks = TestBed.inject(BackgroundTasksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    tasks.stop();
    http.verify();
  });

  it('reads a running training with measured steps and time', () => {
    tasks.start();

    const request = http.expectOne((req) => req.url.endsWith('/language-model/brain'));
    expect(request.request.method).toBe('GET');
    request.flush(
      brainState({
        training: true,
        progress: {
          steps_done: 30,
          steps_total: 120,
          eta_seconds: 90,
          stages: [{ key: 'write', label: 'Writing the material', status: 'working' }],
        },
      }),
    );

    expect(tasks.status()).toBe('ready');
    expect(tasks.tasks()).toEqual([
      {
        key: 'brain-training',
        title: 'Training the neural brain',
        detail: 'Writing the material · 30 of 120 steps · about 2m left',
        percent: 25,
      },
    ]);
  });

  it('lists nothing when no task is running', () => {
    tasks.start();
    http.expectOne((req) => req.url.endsWith('/language-model/brain')).flush(brainState());

    expect(tasks.status()).toBe('ready');
    expect(tasks.tasks()).toEqual([]);
    expect(tasks.error()).toBeNull();
  });

  it('keeps the brain reading for the engine details', () => {
    tasks.start();
    http
      .expectOne((req) => req.url.endsWith('/language-model/brain'))
      .flush(brainState({ vocabulary: 12, engine: { device: 'cpu', torch: '2.9.0' } }));

    expect(tasks.brain()?.vocabulary).toBe(12);
    expect(tasks.brain()?.engine.device).toBe('cpu');
  });

  it('keeps checking while idle, so a task that starts later is listed', () => {
    vi.useFakeTimers();
    try {
      tasks.start();
      http.expectOne((req) => req.url.endsWith('/language-model/brain')).flush(brainState());
      expect(tasks.tasks()).toEqual([]);

      vi.advanceTimersByTime(15000);
      http
        .expectOne((req) => req.url.endsWith('/language-model/brain'))
        .flush(brainState({ training: true, progress: { steps_done: 2, steps_total: 4 } }));

      expect(tasks.tasks()[0]?.percent).toBe(50);
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves the share unknown while the steps cannot be counted', () => {
    tasks.start();
    http
      .expectOne((req) => req.url.endsWith('/language-model/brain'))
      .flush(
        brainState({
          training: true,
          progress: {
            stages: [{ key: 'collect', label: 'Reading the sources', status: 'working' }],
          },
        }),
      );

    const task = tasks.tasks()[0];
    expect(task.detail).toBe('Reading the sources · Counting the material…');
    expect(task.percent).toBeNull();
  });

  it('reports a read failure instead of inventing a task', () => {
    tasks.start();
    http
      .expectOne((req) => req.url.endsWith('/language-model/brain'))
      .flush({ detail: 'No session' }, { status: 401, statusText: 'Unauthorized' });

    expect(tasks.status()).toBe('error');
    expect(tasks.error()).toBeTruthy();
    expect(tasks.tasks()).toEqual([]);
  });
});
