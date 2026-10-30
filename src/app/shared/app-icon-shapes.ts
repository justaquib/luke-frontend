/** One stroke of an icon: a path, a rounded rectangle, or a circle. */
export type IconShape =
  | { kind: 'path'; d: string }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

/** The product's stroke icons, drawn on the same 24×24 grid. */
export const ICONS = {
  plus: [{ kind: 'path', d: 'M12 5v14M5 12h14' }],
  check: [{ kind: 'path', d: 'M5 12l4 4L19 6' }],
  x: [{ kind: 'path', d: 'M18 6L6 18M6 6l12 12' }],
  pencil: [
    { kind: 'path', d: 'M4 20h4L19 9l-4-4L4 16z' },
    { kind: 'path', d: 'M13.5 6.5l4 4' },
  ],
  trash: [
    { kind: 'path', d: 'M4 7h16' },
    { kind: 'path', d: 'M9 7V5h6v2' },
    { kind: 'path', d: 'M6 7l1 13h10l1-13' },
    { kind: 'path', d: 'M10 11v6M14 11v6' },
  ],
  merge: [
    { kind: 'circle', cx: 18, cy: 18, r: 3 },
    { kind: 'circle', cx: 6, cy: 6, r: 3 },
    { kind: 'path', d: 'M6 21V9a9 9 0 0 0 9 9' },
  ],
  inbox: [
    { kind: 'path', d: 'M4 13l2-8h12l2 8' },
    { kind: 'path', d: 'M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5' },
    { kind: 'path', d: 'M4 13h5l1 2h4l1-2h5' },
  ],
  book: [
    { kind: 'path', d: 'M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z' },
    { kind: 'path', d: 'M8 7h8M8 11h6' },
  ],
  file: [
    { kind: 'path', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
    { kind: 'path', d: 'M14 2v6h6M16 13H8M16 17H8M10 9H8' },
  ],
  copy: [
    { kind: 'rect', x: 9, y: 9, width: 12, height: 12, rx: 2 },
    {
      kind: 'path',
      d: 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    },
  ],
  code: [
    { kind: 'path', d: 'M9 7l-5 5 5 5' },
    { kind: 'path', d: 'M15 7l5 5-5 5' },
  ],
  eye: [
    { kind: 'path', d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' },
    { kind: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  upload: [{ kind: 'path', d: 'M12 16V4M7 9l5-5 5 5M5 20h14' }],
  download: [{ kind: 'path', d: 'M12 4v12M7 11l5 5 5-5M5 20h14' }],
  refresh: [
    {
      kind: 'path',
      d: 'M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5',
    },
  ],
  search: [
    { kind: 'circle', cx: 11, cy: 11, r: 7 },
    { kind: 'path', d: 'M20 20l-4-4' },
  ],
  'arrow-right': [{ kind: 'path', d: 'M5 12h14M13 6l6 6-6 6' }],
  'arrow-left': [{ kind: 'path', d: 'M19 12H5M11 6l-6 6 6 6' }],
  'arrow-up': [{ kind: 'path', d: 'M12 19V5M6 11l6-6 6 6' }],
  send: [
    { kind: 'path', d: 'M22 2L11 13' },
    { kind: 'path', d: 'M22 2l-7 20-4-9-9-4z' },
  ],
  stop: [{ kind: 'rect', x: 6, y: 6, width: 12, height: 12, rx: 2 }],
  sliders: [
    { kind: 'path', d: 'M4 6h16M4 12h16M4 18h16' },
    { kind: 'circle', cx: 9, cy: 6, r: 2 },
    { kind: 'circle', cx: 15, cy: 12, r: 2 },
    { kind: 'circle', cx: 7, cy: 18, r: 2 },
  ],
  external: [
    {
      kind: 'path',
      d: 'M14 4h6v6M20 4l-9 9M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5',
    },
  ],
  info: [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M12 11v5' },
    { kind: 'path', d: 'M12 8h.01' },
  ],
  alert: [
    { kind: 'path', d: 'M12 3 2 20h20z' },
    { kind: 'path', d: 'M12 9v5' },
    { kind: 'path', d: 'M12 17h.01' },
  ],
  'thumb-up': [
    { kind: 'path', d: 'M7 10v11' },
    {
      kind: 'path',
      d: 'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z',
    },
  ],
  'thumb-down': [
    { kind: 'path', d: 'M17 14V3' },
    {
      kind: 'path',
      d: 'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z',
    },
  ],
  pin: [
    { kind: 'path', d: 'M12 21s7-6.2 7-12A7 7 0 1 0 5 9c0 5.8 7 12 7 12z' },
    { kind: 'circle', cx: 12, cy: 9, r: 2.5 },
  ],
  logo: [
    {
      kind: 'path',
      d: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4a2 2 0 0 1-2-2z',
    },
    { kind: 'circle', cx: 9, cy: 10, r: 0.6 },
    { kind: 'circle', cx: 12, cy: 10, r: 0.6 },
    { kind: 'circle', cx: 15, cy: 10, r: 0.6 },
  ],
  play: [{ kind: 'path', d: 'M8 5l11 7-11 7z' }],
  pause: [
    { kind: 'rect', x: 6, y: 5, width: 4, height: 14, rx: 1 },
    { kind: 'rect', x: 14, y: 5, width: 4, height: 14, rx: 1 },
  ],
  logout: [
    { kind: 'path', d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' },
    { kind: 'path', d: 'M16 17l5-5-5-5M21 12H9' },
  ],
  'chevron-down': [{ kind: 'path', d: 'M6 9l6 6 6-6' }],
  'chevron-up': [{ kind: 'path', d: 'M6 15l6-6 6 6' }],
  monitor: [
    { kind: 'rect', x: 3, y: 4, width: 18, height: 12, rx: 2 },
    { kind: 'path', d: 'M8 20h8M12 16v4' },
  ],
  sun: [
    { kind: 'circle', cx: 12, cy: 12, r: 4 },
    {
      kind: 'path',
      d: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    },
  ],
  moon: [
    {
      kind: 'path',
      d: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
    },
  ],
  sidebar: [
    { kind: 'rect', x: 3, y: 4, width: 18, height: 16, rx: 2 },
    { kind: 'path', d: 'M15 4v16' },
  ],
  'sidebar-left': [
    { kind: 'rect', x: 3, y: 4, width: 18, height: 16, rx: 2 },
    { kind: 'path', d: 'M9 4v16' },
  ],
  menu: [{ kind: 'path', d: 'M4 6h16M4 12h16M4 18h16' }],
  palette: [
    {
      kind: 'path',
      d: 'M12 3a9 9 0 1 0 0 18c.9 0 1.6-.7 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.6h2c3 0 5.6-2.5 5.6-5.6C22 6 17.5 3 12 3z',
    },
    { kind: 'circle', cx: 7.5, cy: 10.5, r: 0.8 },
    { kind: 'circle', cx: 10, cy: 7, r: 0.8 },
    { kind: 'circle', cx: 14.5, cy: 7, r: 0.8 },
    { kind: 'circle', cx: 17.5, cy: 10.5, r: 0.8 },
  ],
  layers: [
    { kind: 'path', d: 'M12 2 2 7l10 5 10-5z' },
    { kind: 'path', d: 'M2 17l10 5 10-5' },
    { kind: 'path', d: 'M2 12l10 5 10-5' },
  ],
  grid: [
    { kind: 'rect', x: 3, y: 3, width: 7, height: 7, rx: 1 },
    { kind: 'rect', x: 14, y: 3, width: 7, height: 7, rx: 1 },
    { kind: 'rect', x: 3, y: 14, width: 7, height: 7, rx: 1 },
    { kind: 'rect', x: 14, y: 14, width: 7, height: 7, rx: 1 },
  ],
  shield: [
    { kind: 'path', d: 'M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z' },
    { kind: 'path', d: 'M9 12l2 2 4-4' },
  ],
  lock: [
    { kind: 'rect', x: 5, y: 11, width: 14, height: 10, rx: 2 },
    { kind: 'path', d: 'M8 11V7a4 4 0 0 1 8 0v4' },
  ],
  maximize: [{ kind: 'path', d: 'M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5' }],
  minimize: [{ kind: 'path', d: 'M4 9h5V4M20 9h-5V4M20 15h-5v5M4 15h5v5' }],
  mic: [
    { kind: 'rect', x: 9, y: 3, width: 6, height: 12, rx: 3 },
    { kind: 'path', d: 'M5 11a7 7 0 0 0 14 0' },
    { kind: 'path', d: 'M12 18v3' },
  ],
  volume: [
    { kind: 'path', d: 'M3 9v6h4l5 4V5L7 9H3z' },
    { kind: 'path', d: 'M16 8a5 5 0 0 1 0 8' },
    { kind: 'path', d: 'M19 5a9 9 0 0 1 0 14' },
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
