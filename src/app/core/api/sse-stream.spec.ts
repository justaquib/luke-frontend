import { describe, expect, it } from 'vitest';
import { readFrames } from './sse-stream';

function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe('readFrames', () => {
  it('reads frames split across chunks and stops when the handler asks', async () => {
    const seen: string[] = [];
    const stopped = await readFrames(
      streamOf(['event: run\nda', 'ta: {"a":1}\n\nevent: run\ndata: {"a":2}\n\n']),
      (message) => {
        seen.push(`${message.event}:${message.data}`);
        return message.data === '{"a":2}';
      },
    );

    expect(seen).toEqual(['run:{"a":1}', 'run:{"a":2}']);
    expect(stopped).toBe(true);
  });

  it('reads a last frame that arrives without its closing blank line', async () => {
    const seen: string[] = [];
    const stopped = await readFrames(
      streamOf(['event: error\ndata: {"message":"x"}']),
      (message) => {
        seen.push(message.data);
        return false;
      },
    );

    expect(seen).toEqual(['{"message":"x"}']);
    expect(stopped).toBe(false);
  });
});
