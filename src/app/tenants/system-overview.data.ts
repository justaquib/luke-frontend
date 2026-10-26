/** One package the product is built with, and why it is there. */
export interface SystemPackage {
  /** The name of the package, as it is installed. */
  name: string;
  /** The part of the product it belongs to. */
  area: string;
  /** What it does, in plain words. */
  purpose: string;
  /** Whether the app needs it at runtime or only while it is being built. */
  kind: 'runtime' | 'development';
}

/**
 * The System Overview of the product: every package it is built with, and
 * what each one is for. A package that is added, removed or replaced has to
 * be listed here in the same change.
 */
export const SYSTEM_PACKAGES: SystemPackage[] = [
  {
    name: '@angular/core, common, router, forms, platform-browser, platform-server',
    area: 'Frontend',
    purpose:
      'The framework the screens are built with: the pages, the router, the forms and the server-side rendering.',
    kind: 'runtime',
  },
  {
    name: '@angular/compiler, compiler-cli, ssr',
    area: 'Frontend',
    purpose:
      'The parts of Angular that turn the screens into a build and render them on the server.',
    kind: 'runtime',
  },
  {
    name: 'rxjs',
    area: 'Frontend',
    purpose:
      'The streams the screens listen to, so a page can follow what the backend answers without waiting.',
    kind: 'runtime',
  },
  {
    name: 'express',
    area: 'Frontend',
    purpose: 'The small web server that serves the built screens.',
    kind: 'runtime',
  },
  {
    name: 'tslib',
    area: 'Frontend',
    purpose: 'The small helpers TypeScript needs at runtime.',
    kind: 'runtime',
  },
  {
    name: 'tailwindcss, @tailwindcss/postcss, postcss',
    area: 'Frontend',
    purpose:
      'The tool that turns the utility classes in the screens into the CSS the browser reads.',
    kind: 'runtime',
  },
  {
    name: 'fastapi, uvicorn',
    area: 'Backend',
    purpose: 'The web framework the assistance backend answers on, and the server that runs it.',
    kind: 'runtime',
  },
  {
    name: 'pydantic, pydantic-settings',
    area: 'Backend',
    purpose:
      'The shape of every request and answer, and the settings the backend reads when it starts.',
    kind: 'runtime',
  },
  {
    name: 'sqlalchemy, psycopg2-binary',
    area: 'Backend',
    purpose: 'The database access and the PostgreSQL driver it talks through.',
    kind: 'runtime',
  },
  {
    name: 'chromadb',
    area: 'Backend',
    purpose:
      'The store that keeps the meaning of every taught question, answer and document, so it can be found again.',
    kind: 'runtime',
  },
  {
    name: 'posthog',
    area: 'Backend',
    purpose:
      'The telemetry library chromadb sends its status events through. It is pinned below version 6, the last that accepts the calls chromadb 0.5.5 makes, and the anonymized telemetry is switched off, so it sends nothing.',
    kind: 'runtime',
  },
  {
    name: 'spacy',
    area: 'Backend',
    purpose:
      'The language tool that reads a question, repairs the wording of a lesson and finds the names in a text.',
    kind: 'runtime',
  },
  {
    name: 'torch',
    area: 'Backend',
    purpose:
      'The library Luke’s word model and the fine-tuned Hugging Face teachers are trained and served with, on this machine only.',
    kind: 'runtime',
  },
  {
    name: 'transformers, safetensors',
    area: 'Backend',
    purpose:
      'The Hugging Face libraries the Base model tab fine-tunes a small teacher with, and that answer and predict from it: safetensors loads the weights and transformers runs the model with its measured attention.',
    kind: 'runtime',
  },
  {
    name: 'nltk',
    area: 'Backend',
    purpose:
      'The offline English dictionary (WordNet) Luke reads each question with: word meanings, parts of speech and synonyms, with no network call.',
    kind: 'runtime',
  },
  {
    name: 'python-docx, openpyxl, xlrd, pandas, pypdf',
    area: 'Backend',
    purpose:
      'The readers that open the uploaded Word, Excel and PDF files and pull their text out.',
    kind: 'runtime',
  },
  {
    name: 'python-multipart',
    area: 'Backend',
    purpose: 'The support for the file uploads the trainer sends.',
    kind: 'runtime',
  },
  {
    name: 'google-auth, python-jose, email-validator',
    area: 'Backend',
    purpose:
      'The sign-in with Google, the tokens the sessions carry and the check on the addresses they are sent to.',
    kind: 'runtime',
  },
  {
    name: 'eslint, @eslint/js, typescript-eslint, @typescript-eslint/*',
    area: 'Development',
    purpose:
      'The linter that reads the TypeScript and reports the unsafe types and the mistakes before the code is shipped.',
    kind: 'development',
  },
  {
    name: 'angular-eslint, @angular-eslint/*',
    area: 'Development',
    purpose:
      'The lint rules that know Angular, so the templates and the components are checked as well.',
    kind: 'development',
  },
  {
    name: 'eslint-config-prettier, eslint-plugin-import, globals',
    area: 'Development',
    purpose:
      'The lint settings that let the formatter and the linter agree, and that keep the imports in order.',
    kind: 'development',
  },
  {
    name: 'prettier',
    area: 'Development',
    purpose: 'The formatter that writes every file the same way.',
    kind: 'development',
  },
  {
    name: 'typescript',
    area: 'Development',
    purpose: 'The compiler that checks the types of the whole frontend before it is built.',
    kind: 'development',
  },
  {
    name: '@angular/build, @angular/cli, @angular/compiler-cli',
    area: 'Development',
    purpose: 'The build of the screens and the test runner that serves them.',
    kind: 'development',
  },
  {
    name: 'vitest, jsdom',
    area: 'Development',
    purpose: 'The test runner and the browser-like environment the frontend tests run in.',
    kind: 'development',
  },
  {
    name: '@types/node, @types/express',
    area: 'Development',
    purpose: 'The type definitions of Node and Express, so the server code is checked too.',
    kind: 'development',
  },
  {
    name: 'ruff',
    area: 'Development',
    purpose:
      'The linter and the formatter of the backend, and the structure check that keeps the modules apart.',
    kind: 'development',
  },
];
