/**
 * The browser side of an overlay, kept out of the components and safe when
 * the app renders on the server.
 */
export function lockPageScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = previous;
  };
}

export function activeElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  return active instanceof HTMLElement ? active : null;
}

export function focusElement(element: HTMLElement | null | undefined): void {
  element?.focus();
}
