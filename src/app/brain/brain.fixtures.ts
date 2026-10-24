import { type ComponentFixture } from '@angular/core/testing';
import { type HttpTestingController } from '@angular/common/http/testing';
import { type Brain } from './brain';

const LEVELS = [
  {
    level: '0.0.0',
    name: 'Seed',
    description: 'The floor.',
    reference: 'Seed',
    open: true,
    band: '0.0',
    band_name: 'Foundations',
    band_detail: 'Holding what it was taught.',
  },
  {
    level: '0.0.1',
    name: 'Cued',
    description: 'Find the exact answer.',
    reference: 'First rung',
    open: true,
    band: '0.0',
    band_name: 'Foundations',
    band_detail: 'Holding what it was taught.',
  },
  {
    level: '0.1.0',
    name: 'Independent',
    description: 'Answer in its own words.',
    reference: 'Milestone',
    open: true,
    band: '0.1',
    band_name: 'Independence',
    band_detail: 'Answering without being taught.',
  },
  {
    level: '0.1.1',
    name: 'Recalled',
    description: 'Planned.',
    reference: 'Planned',
    open: false,
    band: '0.1',
    band_name: 'Independence',
    band_detail: 'Answering without being taught.',
  },
];

const VOLUME = { title: 'Newborn', detail: '', items: 0, stages: [], next_stage: null };

const COVERAGE = {
  documents: 0,
  chunks: 0,
  trained_answers: 0,
  lessons: 0,
  passed_grades: 0,
  current_stage: 'nursery',
};

export const level = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  level: '0.0.0',
  measured_level: '0.0.0',
  approval_ready: false,
  level_value: 0,
  name: 'Newborn',
  title: 'Newborn',
  description: 'It knows a few words.',
  reference: 'Seed',
  next_level: '0.0.1',
  next_requirement: 'Pass the first rung.',
  capabilities: [],
  max_level: '1.0.0',
  ladder_size: 101,
  levels: LEVELS,
  training_volume: VOLUME,
  rungs: [],
  next_steps: [],
  coverage: COVERAGE,
  generality: 0,
  generality_cap: null,
  generality_probes: [],
  instruction_following: 0,
  instruction_probes: [],
  instruction_total: 0,
  instruction_measured: false,
  ladder_share: 0,
  frontier_level: 6,
  frontier_title: 'Frontier',
  frontier_note: '',
  model_name: 'Luke',
  ...overrides,
});

export const engine = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  schema: 0,
  device: 'cpu',
  torch: '2.9.0',
  answer: { trained: false },
  words: { trained: false, backend: 'untrained', backend_reason: 'no word model' },
  runs: [],
  ...overrides,
});

export const brain = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  trained: false,
  vocabulary: 10,
  transformer: {},
  transformer_ready: false,
  training: false,
  progress: null,
  emotions: [],
  emotion_ready: false,
  clarify_ready: false,
  confidence_ready: false,
  intent_ready: false,
  intents: [],
  feedback_entries: 0,
  correct_answers: 0,
  wrong_answers: 0,
  corrections: 0,
  learned_corrections: 0,
  engine: engine(),
  model_level: level(),
  ...overrides,
});

const trainedEngine = (): Record<string, unknown> =>
  engine({
    schema: 2,
    answer: {
      trained: true,
      validation_loss: 4.371,
      chance_loss: 7.4628,
      loss: 4.1,
      steps: 300,
      passes: 8,
      stop_reason: 'steps',
      train_examples: 36619,
      validation_examples: 4000,
      curve: [7.4, 5.1, 4.4],
      validation_curve: [7.5, 5.2, 4.4],
      corpus: { sentences: 3200, instructions: 120, contexts: 40 },
      dropped_sentences: 2,
    },
    words: {
      trained: true,
      backend: 'neural',
      backend_reason: 'held-out loss is below the gate',
      validation_loss: 3.1,
      chance_loss: 6.9,
      next_word_accuracy: 0.42,
      perplexity: 22.2,
      passes: 8,
      steps: 500,
      sentence_count: 3200,
      token_count: 48000,
    },
    runs: [
      {
        task: 'answer',
        at: 1760000000,
        loss: 4.1,
        validation_loss: 4.371,
        passes: 8,
        stop_reason: 'steps',
        steps: 300,
        seconds: 120,
      },
    ],
  });

const trainedLevel = (): Record<string, unknown> =>
  level({
    coverage: {
      documents: 3,
      chunks: 90,
      trained_answers: 120,
      lessons: 40,
      passed_grades: 2,
      current_stage: 'nursery',
    },
    ladder_share: 0.35,
    instruction_following: 0.75,
    instruction_total: 12,
    instruction_written: 9,
    instruction_looked_up: 3,
    instruction_measured: true,
    adversarial: { score: 0.25, passed: 2, total: 8 },
  });

export const trainedBrain = (): Record<string, unknown> =>
  brain({
    trained: true,
    vocabulary: 1742,
    corrections: 12,
    engine: trainedEngine(),
    model_level: trainedLevel(),
  });

export const store = (): Record<string, unknown> => ({
  documents: [],
  totals: { files: 0, chunks: 0, answers: 0, pending: 0, lessons: 0, vocabulary: 0 },
  model: {
    name: 'Luke',
    level: 0,
    title: 'Newborn',
    vocabulary: 0,
    parameters: 0,
    trained: false,
    steps: 0,
    loss: null,
    corpus_sentences: 0,
    corpus_tokens: 0,
  },
  disk: { learner_bytes: 0, vector_store_bytes: 0, uploads_bytes: 0 },
});

export const read = async (
  fixture: ComponentFixture<Brain>,
  http: HttpTestingController,
  state: object,
): Promise<void> => {
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/language-model/store')).flush(store());
  http.expectOne((req) => req.url.endsWith('/language-model/brain')).flush(state);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

/** Open the shared info panel, where the page actions now live. */
export const openInfo = (fixture: ComponentFixture<Brain>, http: HttpTestingController): void => {
  (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLButtonElement>('.top-bar .info-btn')
    ?.click();
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/language-model/brain')).flush(brain());
  http
    .expectOne((req) => req.url.endsWith('/language-model/settings'))
    .flush({ name: 'Luke', start_level: '0.0.0', level: '0.0.0' });
  fixture.detectChanges();
};
