import { SseParser, type SseMessage } from './sse-parser';

/** Handles one frame; true means the stream is finished and reading stops. */
export type FrameHandler = (message: SseMessage) => boolean;

/**
 * Reads a server-sent event body, handing every frame to the handler. Returns
 * true when the handler stopped the stream, so the caller can tell a finished
 * stream from one whose connection ended early. The body is cancelled either
 * way, because the server holds the connection open until the run is done.
 */
export async function readFrames(
  body: ReadableStream<Uint8Array>,
  handle: FrameHandler,
): Promise<boolean> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  let stopped = false;
  while (!stopped) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const message of parser.push(decoder.decode(value, { stream: true }))) {
      if (handle(message)) {
        stopped = true;
        break;
      }
    }
  }
  if (!stopped) {
    for (const message of parser.flush()) {
      if (handle(message)) break;
    }
  }
  await reader.cancel().catch(() => undefined);
  return stopped;
}
