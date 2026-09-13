export type GadgetType =
  | 'marble'
  | 'start_gate'
  | 'goal'
  | 'plank'
  | 'book'
  | 'domino'
  | 'spring'
  | 'seesaw'
  | 'paper_cup'
  | 'toilet_paper_tube'
  | 'rubber_band'
  | 'pendulum'
  | 'fan'
  | 'magnet'
  | 'water';

export interface GadgetOptions {
  width?: number;
  height?: number;
  radius?: number;
  restitution?: number; // Bounce
  friction?: number;
  density?: number;
  isStatic?: boolean;
  power?: number; // for fan wind or magnet force or spring power
  color?: string;
  label?: string;
  isPlayerBall?: boolean;
  length?: number; // for pendulum or rubber band
  polarity?: 'attract' | 'repel'; // for magnet
}

export interface GadgetData {
  id: string;
  type: GadgetType;
  x: number;
  y: number;
  angle: number; // in radians
  options?: GadgetOptions;
}

export interface CourseData {
  id: string;
  title: string;
  description: string;
  gadgets: GadgetData[];
}

export type SimulationSpeed = 0.5 | 1.0 | 2.0;

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}
