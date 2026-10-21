/** One point of the drawn brain on the page. */
export interface BrainNode {
  id: number;
  x: number;
  y: number;
  delay: number;
}

/**
 * Where the points of the drawn brain sit. They are laid out by hand, so the
 * shape reads the same on every screen.
 */
export const KNOWLEDGE_NODES: BrainNode[] = [
  { id: 1, x: 26, y: 15, delay: 0 },
  { id: 2, x: 38, y: 13, delay: 180 },
  { id: 3, x: 47, y: 20, delay: 420 },
  { id: 4, x: 19, y: 27, delay: 260 },
  { id: 5, x: 30, y: 31, delay: 640 },
  { id: 6, x: 42, y: 33, delay: 120 },
  { id: 7, x: 14, y: 41, delay: 520 },
  { id: 8, x: 24, y: 44, delay: 340 },
  { id: 9, x: 35, y: 45, delay: 80 },
  { id: 10, x: 44, y: 42, delay: 720 },
  { id: 11, x: 13, y: 53, delay: 200 },
  { id: 12, x: 23, y: 58, delay: 460 },
  { id: 13, x: 33, y: 56, delay: 60 },
  { id: 14, x: 42, y: 54, delay: 620 },
  { id: 15, x: 17, y: 67, delay: 380 },
  { id: 16, x: 27, y: 71, delay: 140 },
  { id: 17, x: 38, y: 68, delay: 560 },
  { id: 18, x: 22, y: 80, delay: 240 },
  { id: 19, x: 32, y: 82, delay: 680 },
  { id: 20, x: 41, y: 78, delay: 320 },
  { id: 21, x: 74, y: 15, delay: 120 },
  { id: 22, x: 62, y: 13, delay: 300 },
  { id: 23, x: 53, y: 20, delay: 500 },
  { id: 24, x: 81, y: 27, delay: 200 },
  { id: 25, x: 70, y: 31, delay: 580 },
  { id: 26, x: 58, y: 33, delay: 100 },
  { id: 27, x: 86, y: 41, delay: 460 },
  { id: 28, x: 76, y: 44, delay: 280 },
  { id: 29, x: 65, y: 45, delay: 60 },
  { id: 30, x: 56, y: 42, delay: 660 },
  { id: 31, x: 87, y: 53, delay: 160 },
  { id: 32, x: 77, y: 58, delay: 420 },
  { id: 33, x: 67, y: 56, delay: 40 },
  { id: 34, x: 58, y: 54, delay: 600 },
  { id: 35, x: 83, y: 67, delay: 340 },
  { id: 36, x: 73, y: 71, delay: 120 },
  { id: 37, x: 62, y: 68, delay: 520 },
  { id: 38, x: 78, y: 80, delay: 220 },
  { id: 39, x: 68, y: 82, delay: 640 },
  { id: 40, x: 59, y: 78, delay: 300 },
];
