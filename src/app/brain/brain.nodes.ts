/** One stage of the brain: how much it knows. */
export interface BrainStage {
  name: string;
  minimum: number;
  description: string;
}

/** The stages the brain page shows, from the least knowledge to the most. */
export const BRAIN_STAGES: BrainStage[] = [
  { name: 'Newborn', minimum: 0, description: 'No indexed knowledge yet' },
  { name: 'Learning', minimum: 1, description: 'The first knowledge is taking shape' },
  { name: 'Capable', minimum: 25, description: 'A growing base of learned material' },
  { name: 'Skilled', minimum: 100, description: 'A substantial indexed knowledge base' },
  { name: 'Experienced', minimum: 500, description: 'A broad library of learned material' },
];

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

/** One node of the knowledge graph: a subject, or a lesson of one. */
export interface GraphNode {
  id: string;
  type: string;
  label?: string;
  count?: number;
  grade?: string;
}

/** Where a node of the knowledge graph is drawn. */
export interface GraphPoint {
  x: number;
  y: number;
}

/**
 * The place of a node of the knowledge graph.
 *
 * The subjects stand in a column on the left, and the lessons of every
 * subject stand in four columns on the right.
 */
export function graphPoint(id: string, graph: { nodes: GraphNode[] }): GraphPoint {
  const nodes = graph?.nodes ?? [];
  const subjects = nodes.filter((node) => node.type === 'subject');
  const lessons = nodes.filter((node) => node.type !== 'subject');
  const subject = subjects.find((node) => node.id === id);
  if (subject) {
    const index = subjects.indexOf(subject);
    const step = 470 / Math.max(subjects.length - 1, 1);
    return { x: 130, y: 30 + index * step };
  }
  const index = lessons.findIndex((node) => node.id === id);
  if (index < 0) return { x: 0, y: 0 };
  const perColumn = Math.ceil(lessons.length / 4);
  const column = Math.floor(index / perColumn);
  const row = index % perColumn;
  const step = 470 / Math.max(perColumn - 1, 1);
  return { x: 400 + column * 145, y: 30 + row * step };
}
