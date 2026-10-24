import type { TemplateRef } from '@angular/core';
import { RightSidebarService } from './right-sidebar.service';

const template = {} as unknown as TemplateRef<unknown>;

describe('RightSidebarService', () => {
  let sidebar: RightSidebarService;

  beforeEach(() => {
    sidebar = new RightSidebarService();
  });

  it('starts closed with no details', () => {
    expect(sidebar.isOpen()).toBe(false);
    expect(sidebar.isExpanded()).toBe(false);
    expect(sidebar.details()).toBeNull();
    expect(sidebar.info()).toBe(false);
  });

  it('shows the details and keeps them while the panel is toggled', () => {
    sidebar.show({ owner: 'trainer', title: 'Trained answer', template });

    expect(sidebar.isOpen()).toBe(true);
    expect(sidebar.details()?.title).toBe('Trained answer');

    sidebar.toggle();
    expect(sidebar.isOpen()).toBe(false);
    expect(sidebar.details()?.owner).toBe('trainer');

    sidebar.toggle();
    expect(sidebar.isOpen()).toBe(true);
  });

  it('keeps the details ready for the toggle without opening the panel', () => {
    sidebar.setDetails({ owner: 'learner', title: 'Language Learner', template });

    expect(sidebar.details()?.title).toBe('Language Learner');
    expect(sidebar.isOpen()).toBe(false);

    sidebar.toggle();
    expect(sidebar.isOpen()).toBe(true);
  });

  it('expands and compacts again', () => {
    sidebar.toggleExpanded();
    expect(sidebar.isExpanded()).toBe(true);

    sidebar.toggleExpanded();
    expect(sidebar.isExpanded()).toBe(false);
  });

  it('opens on the page information when no page owns the panel', () => {
    sidebar.toggle();

    expect(sidebar.isOpen()).toBe(true);
    expect(sidebar.info()).toBe(true);

    sidebar.toggleInfo();
    expect(sidebar.isOpen()).toBe(false);
    expect(sidebar.info()).toBe(true);
  });

  it('shows the page information over the page details on request', () => {
    sidebar.show({ owner: 'trainer', title: 'Trained answer', template });
    expect(sidebar.info()).toBe(false);

    sidebar.showInfo();
    expect(sidebar.isOpen()).toBe(true);
    expect(sidebar.info()).toBe(true);

    sidebar.close();
    sidebar.toggle();
    expect(sidebar.info()).toBe(false);
    expect(sidebar.isOpen()).toBe(true);
  });

  it('clears the details only for the owner that asks', () => {
    sidebar.show({ owner: 'trainer', title: 'Trained answer', template });

    sidebar.clearDetails('brain');
    expect(sidebar.details()?.owner).toBe('trainer');
    expect(sidebar.isOpen()).toBe(true);

    sidebar.clearDetails('trainer');
    expect(sidebar.details()).toBeNull();
    expect(sidebar.isOpen()).toBe(false);
  });

  it('clears any details when no owner is named', () => {
    sidebar.show({ owner: 'brain', title: 'Training sources', template });

    sidebar.clearDetails();

    expect(sidebar.details()).toBeNull();
    expect(sidebar.isOpen()).toBe(false);
  });
});
