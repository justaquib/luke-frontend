import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, ViewChild, type TemplateRef } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppRightSidebar } from './app-right-sidebar';
import { BackgroundTasksService } from './background-tasks.service';
import { PageInfoActions } from './page-info-actions';
import { PageInfoFacts } from './page-info-facts';
import { RightSidebarService } from './right-sidebar.service';

@Component({
  selector: 'app-sidebar-host',
  standalone: true,
  imports: [AppRightSidebar, PageInfoActions, PageInfoFacts],
  templateUrl: './app-right-sidebar.spec-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SidebarHost {
  @ViewChild('details', { static: true }) details!: TemplateRef<unknown>;
}

const modelSettings = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Luke',
  start_level: '0.0.0',
  level: '0.0.0',
  defaults: { name: 'Luke', start_level: '0.0.0' },
  levels: [{ level: '0.0.0', name: 'Newborn', title: 'Luke 0.0.0', description: 'Seed' }],
  ...overrides,
});

const brainState = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  trained: true,
  vocabulary: 12,
  training: false,
  progress: null,
  engine: { device: 'cpu', torch: '2.9.0' },
  ...overrides,
});

function text(node: Element): string {
  return node.textContent?.trim() ?? '';
}

describe('AppRightSidebar', () => {
  let fixture: ComponentFixture<SidebarHost>;
  let http: HttpTestingController;
  let sidebar: RightSidebarService;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const readEngine = (state: Record<string, unknown> = brainState()): void => {
    http.expectOne((req) => req.url.endsWith('/language-model/brain')).flush(state);
  };

  const readModel = (settings: Record<string, unknown> = modelSettings()): void => {
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(settings);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarHost],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'dashboard/brain', children: [] },
          { path: 'dashboard/trainer', children: [] },
        ]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarHost);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    sidebar = TestBed.inject(RightSidebarService);
  });

  afterEach(() => {
    TestBed.inject(BackgroundTasksService).stop();
    http.verify();
  });

  it('opens on the page information and closes on the backdrop', async () => {
    await TestBed.inject(Router).navigateByUrl('/dashboard/brain');
    fixture.detectChanges();

    sidebar.open();
    fixture.detectChanges();
    readModel();
    readEngine();
    fixture.detectChanges();

    expect(root().querySelector('.right-sidebar')).toBeTruthy();
    expect(root().querySelector('.right-sidebar')?.getAttribute('role')).toBe('dialog');
    expect(text(root().querySelector('.sidebar-eyebrow')!)).toBe('Model builder');
    expect(text(root().querySelector('#right-sidebar-title')!)).toBe('Neural engine');
    expect(text(root().querySelector('.sidebar-subtitle')!)).toBe(
      'What the brain has learned, what it can do on its own, and what it still needs to be taught.',
    );
    expect(root().querySelector('.engine-details')).toBeTruthy();
    expect(text(root().querySelector('.host-fact')!)).toBe('41 messages');
    expect(text(root().querySelector('.host-action')!)).toBe('Train');

    const body = root().querySelector('.page-info');
    const blocks = [...(body?.children ?? [])];
    expect(blocks[0].classList.contains('page-info-facts')).toBe(true);
    expect(blocks[1].classList.contains('page-info-actions')).toBe(true);

    expect(root().querySelector('.sidebar-tasks')).toBeNull();

    root().querySelector<HTMLElement>('.sidebar-backdrop')?.click();
    fixture.detectChanges();
    expect(root().querySelector('.right-sidebar')).toBeNull();
    expect(sidebar.isOpen()).toBe(false);
  });

  it('reads the model and the engine into the engine facts', async () => {
    await TestBed.inject(Router).navigateByUrl('/dashboard/brain');
    fixture.detectChanges();

    sidebar.open();
    fixture.detectChanges();
    readModel(modelSettings({ name: 'Nova', level: '0.0.2', start_level: '0.0.1' }));
    readEngine(brainState({ vocabulary: 12, engine: { device: 'cpu', torch: '2.9.0' } }));
    fixture.detectChanges();

    const facts = root().querySelector('app-engine-facts');
    expect(facts?.querySelector('.engine-facts')?.getAttribute('aria-label')).toBe(
      'Neural engine state',
    );
    expect(Array.from(facts?.querySelectorAll('dt') ?? []).map(text)).toEqual([
      'Model',
      'Version',
      'State',
      'Vocabulary',
      'Device',
    ]);
    expect(Array.from(facts?.querySelectorAll('dd') ?? []).map(text)).toEqual([
      'Nova',
      '0.0.2',
      'Trained',
      '12 words',
      'cpu',
    ]);
    expect(facts?.textContent).toContain('starts at 0.0.1');
  });

  it('shows the details of the page and expands and closes from the header', () => {
    sidebar.show({
      owner: 'trainer',
      title: 'Trained answer',
      subtitle: 'Question and answer · #4',
      template: fixture.componentInstance.details,
    });
    fixture.detectChanges();
    readEngine(brainState({ trained: false }));
    fixture.detectChanges();

    expect(text(root().querySelector('.sidebar-eyebrow')!)).toBe('Sidebar');
    expect(text(root().querySelector('#right-sidebar-title')!)).toBe('Trained answer');
    expect(text(root().querySelector('.sidebar-subtitle')!)).toBe('Question and answer · #4');
    expect(text(root().querySelector('.test-detail')!)).toBe('Detail body');
    expect(root().querySelector('.sidebar-tasks')).toBeNull();

    root().querySelector<HTMLButtonElement>('button[aria-label="Expand the sidebar"]')!.click();
    fixture.detectChanges();
    expect(root().querySelector('.right-sidebar')!.classList.contains('expanded')).toBe(true);
    expect(root().querySelector('button[aria-label="Make the sidebar compact"]')).toBeTruthy();

    root().querySelector<HTMLButtonElement>('button[aria-label="Close the sidebar"]')!.click();
    fixture.detectChanges();
    expect(root().querySelector('.right-sidebar')).toBeNull();
    expect(sidebar.details()?.owner).toBe('trainer');
  });

  it('pins a running training under the page details', () => {
    sidebar.show({
      owner: 'trainer',
      title: 'Trained answer',
      template: fixture.componentInstance.details,
    });
    fixture.detectChanges();
    readEngine(
      brainState({
        training: true,
        progress: {
          steps_done: 5,
          steps_total: 10,
          eta_seconds: 30,
          stages: [{ key: 'write', label: 'Writing the material', status: 'working' }],
        },
      }),
    );
    fixture.detectChanges();

    const body = root().querySelector('.sidebar-body');
    expect(body?.lastElementChild?.classList.contains('sidebar-tasks')).toBe(true);
    const meter = root().querySelector('.sidebar-tasks .task-meter');
    expect(root().querySelector('.sidebar-tasks')?.textContent).toContain(
      'Training the neural brain',
    );
    expect(root().querySelector('.sidebar-tasks')?.textContent).toContain('5 of 10 steps');
    expect(meter?.getAttribute('role')).toBe('progressbar');
    expect(meter?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('keeps the task list out when the page asks for it', () => {
    sidebar.show({
      owner: 'brain',
      title: 'Training sources',
      template: fixture.componentInstance.details,
      showTasks: false,
    });
    fixture.detectChanges();

    expect(root().querySelector('.sidebar-tasks')).toBeNull();
    http.expectNone((req) => req.url.endsWith('/language-model/brain'));
  });
});
