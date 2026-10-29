/**
 * The prose runs and fenced code blocks an answer text is made of.
 *
 * The engine writes code as a fenced block (three backticks, an optional
 * language, the code, and a closing fence). A reveal shows that block whole
 * once the words before it have arrived, so the reader never sees half a
 * fence. An answer that is still streaming has no closing fence; the rest of
 * the text is then treated as code, which is exactly what is on screen.
 */

export type AnswerPart = {
  kind: 'prose' | 'code';
  text: string;
  language: string;
  /** Words of the answer before this part. */
  start: number;
  /** Words of the answer up to and including this part. */
  end: number;
};

/** A fence line, with the optional language the writer named. */
const FENCE = /^\s{0,3}```([A-Za-z0-9+#._-]*)\s*$/;

function wordsOf(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function languageOf(line: string): string {
  return (FENCE.exec(line)?.[1] ?? '').toLowerCase();
}

/** The answer split into prose and code, without word positions. */
function rawParts(text: string): { kind: 'prose' | 'code'; text: string; language: string }[] {
  const parts: { kind: 'prose' | 'code'; text: string; language: string }[] = [];
  const prose: string[] = [];
  let code: string[] | null = null;
  let language = '';

  const flushProse = (): void => {
    const run = prose.join('\n').replace(/\s+$/, '');
    prose.length = 0;
    if (run) parts.push({ kind: 'prose', text: run, language: '' });
  };
  const flushCode = (): void => {
    if (code) {
      const run = code.join('\n').replace(/\n+$/, '');
      if (run) parts.push({ kind: 'code', text: run, language });
    }
    code = null;
  };

  for (const line of text.split('\n')) {
    if (FENCE.test(line)) {
      if (code) flushCode();
      else {
        flushProse();
        language = languageOf(line);
        code = [];
      }
      continue;
    }
    if (code) code.push(line);
    else prose.push(line);
  }
  if (code) flushCode();
  else flushProse();
  return parts;
}

/** The parts of an answer, each marked with the words before and after it. */
export function parseAnswer(text: string): AnswerPart[] {
  let used = 0;
  return rawParts(text).map((part) => {
    const start = used;
    used += wordsOf(part.text);
    return { ...part, start, end: used };
  });
}

/** How many words the answer holds, fences excluded. */
export function answerWordCount(parts: AnswerPart[]): number {
  return parts.at(-1)?.end ?? 0;
}

/** The first whole words of a run, keeping the spacing the writer used. */
function firstWords(text: string, count: number): string {
  const tokens = text.split(/(\s+)/);
  let seen = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    if (!tokens[index].trim()) continue;
    seen += 1;
    if (seen === count)
      return tokens
        .slice(0, index + 1)
        .join('')
        .replace(/\s+$/, '');
  }
  return text;
}

/** The parts visible once `words` words of the answer have been revealed. */
export function revealAnswer(parts: AnswerPart[], words: number): AnswerPart[] {
  const visible: AnswerPart[] = [];
  for (const part of parts) {
    if (words <= part.start) break;
    if (words >= part.end) {
      visible.push(part);
      continue;
    }
    if (part.kind === 'code') {
      visible.push(part);
      continue;
    }
    visible.push({ ...part, text: firstWords(part.text, words - part.start), end: words });
  }
  return visible;
}
