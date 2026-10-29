import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

void bootstrapApplication(App, appConfig).catch((error: unknown) => {
  queueMicrotask(() => {
    throw error instanceof Error ? error : new Error(String(error));
  });
});
