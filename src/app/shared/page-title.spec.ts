import { describe, expect, it } from 'vitest';
import { pageInfoForUrl } from './page-title';

describe('page information', () => {
  it('names the settings page and its engine scope', () => {
    expect(pageInfoForUrl('/dashboard/settings')).toMatchObject({
      name: 'Settings',
      title: 'Settings',
      scope: 'Engine setting',
      description:
        'The engine connection, the live sources it may fall back to, and how this workspace looks.',
    });
    expect(pageInfoForUrl('/dashboard/settings?tab=appearance').scope).toBe('Engine setting');
  });

  it('keeps the builder and assistant scopes on the other pages', () => {
    expect(pageInfoForUrl('/chat')).toMatchObject({
      name: 'Chat',
      title: 'Chat',
      scope: 'Assistant',
    });
    expect(pageInfoForUrl('/dashboard/learner')).toMatchObject({
      name: 'Language learner',
      title: 'Language learner',
      scope: 'Model builder',
    });
    expect(pageInfoForUrl('/unknown')).toMatchObject({
      name: 'Assistant',
      title: 'Assistant',
      scope: 'Assistant',
    });
  });

  it('carries the neural engine header copy the sidebar shows', () => {
    expect(pageInfoForUrl('/dashboard/brain')).toMatchObject({
      name: 'Assistance brain',
      title: 'Neural engine',
      scope: 'Model builder',
      description:
        'What the brain has learned, what it can do on its own, and what it still needs to be taught.',
    });
  });
});
