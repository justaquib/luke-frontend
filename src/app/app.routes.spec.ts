import { type Route } from '@angular/router';
import { ChatUI } from './chat-ui/chat-ui';
import { Trainer } from './trainer/trainer';
import { ParentingChat } from './parenting/parenting-chat/parenting-chat';
import { Brain } from './brain/brain';
import { Design } from './design/design';
import { Expressions } from './expressions/expressions';
import { Assessment } from './assessment/assessment';
import { Learner } from './learner/learner';
import { Landing } from './landing/landing';
import { Login } from './login/login.component';
import { Settings } from './settings/settings';
import { SystemadminLogin } from './systemadmin-login/systemadmin-login.component';
import { authGuard } from './core/auth.guard';
import { routes } from './app.routes';

function find(path: string): Route | undefined {
  return routes.find((route) => route.path === path);
}

function dashboardChildren(): readonly Route[] {
  return find('dashboard')?.children ?? [];
}

function redirectOf(route: Route): string | undefined {
  return typeof route.redirectTo === 'string' ? route.redirectTo : undefined;
}

describe('Application routes', () => {
  it('keeps the assistant on its own top-level path', () => {
    const chat = find('chat');

    expect(chat?.component).toBe(ChatUI);
    expect(chat?.canActivate).toContain(authGuard);
    expect(chat?.children).toBeUndefined();
  });

  it('serves every model-trainer page below /dashboard', () => {
    const dashboard = find('dashboard');
    expect(dashboard?.canActivate).toContain(authGuard);

    const children = dashboardChildren();
    expect(children.find((route) => route.path === '')?.redirectTo).toBe('trainer');

    const components = new Map(children.map((route) => [route.path, route.component]));
    expect(components.get('trainer')).toBe(Trainer);
    expect(components.get('parenting')).toBe(ParentingChat);
    expect(components.get('learner')).toBe(Learner);
    expect(components.get('brain')).toBe(Brain);
    expect(components.get('expressions')).toBe(Expressions);
    expect(components.get('assessment')).toBe(Assessment);
    expect(components.get('design')).toBe(Design);
    expect(components.get('settings')).toBe(Settings);
  });

  it('sends the old flat paths into the dashboard', () => {
    const legacy = routes.filter((route) => redirectOf(route)?.startsWith('dashboard/'));

    expect(legacy.map((route) => [route.path, redirectOf(route)])).toEqual([
      ['trainer', 'dashboard/trainer'],
      ['parenting', 'dashboard/parenting'],
      ['learner', 'dashboard/learner'],
      ['brain', 'dashboard/brain'],
      ['expressions', 'dashboard/expressions'],
      ['settings', 'dashboard/settings'],
      ['system', 'dashboard/system'],
    ]);
  });

  it('keeps the public entry pages outside the protected namespaces', () => {
    expect(find('')?.component).toBe(Landing);
    expect(find('login')?.component).toBe(Login);
    expect(find('systemadmin')?.component).toBe(SystemadminLogin);
    expect(find('**')?.redirectTo).toBe('');
  });
});
