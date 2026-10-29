import { describe, expect, it } from 'vitest';
import { pageInfoForUrl } from './page-title';

describe('page information', () => {
  it('names the lab settings page and its engine scope', () => {
    expect(pageInfoForUrl('/dashboard/settings')).toMatchObject({
      name: 'Lab settings',
      title: 'Lab settings',
      scope: 'Engine setting',
      description:
        'The engine connection, the live sources it may fall back to, the model identity and how this lab looks.',
    });
    expect(pageInfoForUrl('/dashboard/settings?tab=appearance').scope).toBe('Engine setting');
  });

  it('names the assessment page and what it measures', () => {
    expect(pageInfoForUrl('/dashboard/assessment')).toMatchObject({
      name: 'Assessment',
      title: 'Skill assessment',
      scope: 'Model builder',
    });
  });

  it('keeps the builder and Luke scopes on the other pages', () => {
    expect(pageInfoForUrl('/chat')).toMatchObject({
      name: 'Chat',
      title: 'Chat',
      scope: 'Luke',
    });
    expect(pageInfoForUrl('/dashboard/learner')).toMatchObject({
      name: 'Language learner',
      title: 'Language learner',
      scope: 'Model builder',
    });
    expect(pageInfoForUrl('/unknown')).toMatchObject({
      name: 'Luke',
      title: 'Luke',
      scope: 'Luke',
    });
  });

  it('carries the neural engine header copy the sidebar shows', () => {
    expect(pageInfoForUrl('/dashboard/brain')).toMatchObject({
      name: 'Luke brain',
      title: 'Neural engine',
      scope: 'Model builder',
      description:
        'What the brain has learned, what it can do on its own, and what it still needs to be taught.',
    });
  });
});
