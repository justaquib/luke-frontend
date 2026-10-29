import type {
  AnswerReading,
  AnswerStreamEvent,
  AnswerThinking,
  QuestionUnderstanding,
  SourceConnection,
} from '../core/api/api-models';

/** The stage of the answer the page is currently showing. */
export type PipelinePhase = 'reading' | 'thinking' | 'connecting' | 'writing' | 'answer';

/** What the backend has read and connected so far for one answer. */
export interface AnswerTrace {
  reading: AnswerReading | null;
  thinking: AnswerThinking | null;
  connections: SourceConnection[];
  writing: string | null;
}

export function emptyTrace(): AnswerTrace {
  return { reading: null, thinking: null, connections: [], writing: null };
}

export function hasTrace(trace: AnswerTrace): boolean {
  return !!trace.reading || !!trace.thinking || trace.connections.length > 0;
}

export function applyStreamEvent(trace: AnswerTrace, event: AnswerStreamEvent): AnswerTrace {
  switch (event.type) {
    case 'reading':
      return { ...trace, reading: event.reading };
    case 'thinking':
      return { ...trace, thinking: event.thinking };
    case 'connecting':
      return { ...trace, connections: [...trace.connections, event.connection] };
    case 'writing':
      return { ...trace, writing: event.model };
    case 'token':
      return trace;
    case 'answer':
    case 'done':
    case 'error':
      return trace;
  }
}

export function phaseFor(event: AnswerStreamEvent): PipelinePhase | null {
  switch (event.type) {
    case 'reading':
      return 'reading';
    case 'thinking':
      return 'thinking';
    case 'connecting':
      return 'connecting';
    case 'writing':
      return 'writing';
    case 'token':
      return 'writing';
    case 'answer':
      return 'answer';
    case 'done':
    case 'error':
      return null;
  }
}

/** The stored understanding, in the same shape a live trace uses. */
export function traceFromUnderstanding(
  understanding: QuestionUnderstanding | null | undefined,
): AnswerTrace {
  if (!understanding) return emptyTrace();
  return {
    reading: {
      words: understanding.words,
      question_type: understanding.question_type,
      key_words: understanding.key_words,
    },
    thinking: {
      question_type: understanding.question_type,
      key_words: understanding.key_words,
      plan: understanding.plan,
    },
    connections: understanding.connections ?? [],
    writing: null,
  };
}
