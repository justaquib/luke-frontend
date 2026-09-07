# `src/app/core/`

Cross-cutting Angular building blocks.

## `api.service.ts`

Single HTTP entry-point to the FastAPI backend. Wraps the four endpoints:

| Method      | Backend route | Purpose                         |
| ----------- | ------------- | ------------------------------- |
| `health()`  | `GET /health` | Liveness check                  |
| `query()`   | `POST /query` | Send user question, get hits    |
| `ingest()`  | `POST /ingest`| Train on a new text source      |
| `stats()`   | `GET /stats`  | Total number of stored chunks   |

Base URL comes from `src/environments/environment.ts` (dev: `http://localhost:8000`, prod: same-origin + a reverse proxy in front of FastAPI).

### Adding a new endpoint

```ts
foo(payload: FooRequest): Observable<FooResponse> {
  return this.http
    .post<FooResponse>(`${this.base}/foo`, payload)
    .pipe(catchError((err) => this.handleError(err)));
}
```

Errors are funnelled through `handleError` so every method gives the same shape of `Error` to the caller.

## `environment.ts` / `environment.production.ts`

Angular's `fileReplacements` swaps these at build time (see `angular.json`).
- `environment.ts` — dev, points at `http://localhost:8000`.
- `environment.production.ts` — empty `apiUrl`, expecting a same-origin reverse proxy that forwards `/api/*` to the FastAPI container.