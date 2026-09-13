import { CourseData } from '../types';

export const DEFAULT_COURSES: CourseData[] = [
  {
    id: 'course-1',
    title: '1. 基本の坂道とドミノ連鎖',
    description: '坂道を転がった赤いビー玉がドミノを倒し、本を押し倒してシーソーを動かす基本コースです。',
    gadgets: [
      // Start Gate
      {
        id: 'start-1',
        type: 'start_gate',
        x: 120,
        y: 120,
        angle: 0
      },
      // Player Marble (auto placed at start)
      {
        id: 'marble-1',
        type: 'marble',
        x: 120,
        y: 100,
        angle: 0,
        options: { isPlayerBall: true, color: '#ef4444', radius: 14 }
      },
      // First Slope Plank
      {
        id: 'plank-1',
        type: 'plank',
        x: 200,
        y: 170,
        angle: 0.38, // ~22 degrees slope
        options: { width: 220, height: 16 }
      },
      // Second Slope Plank (reverse direction)
      {
        id: 'plank-2',
        type: 'plank',
        x: 280,
        y: 280,
        angle: -0.32,
        options: { width: 220, height: 16 }
      },
      // Flat Shelf for Dominoes
      {
        id: 'plank-3',
        type: 'plank',
        x: 460,
        y: 350,
        angle: 0.05,
        options: { width: 260, height: 16 }
      },
      // Domino Chain (6 pieces)
      { id: 'dom-1', type: 'domino', x: 380, y: 315, angle: 0 },
      { id: 'dom-2', type: 'domino', x: 415, y: 315, angle: 0 },
      { id: 'dom-3', type: 'domino', x: 450, y: 315, angle: 0 },
      { id: 'dom-4', type: 'domino', x: 485, y: 315, angle: 0 },
      { id: 'dom-5', type: 'domino', x: 520, y: 315, angle: 0 },
      { id: 'dom-6', type: 'domino', x: 555, y: 315, angle: 0 },
      // Upright Book
      {
        id: 'book-1',
        type: 'book',
        x: 600,
        y: 300,
        angle: 0,
        options: { width: 32, height: 85 }
      },
      // Seesaw below the book
      {
        id: 'seesaw-1',
        type: 'seesaw',
        x: 680,
        y: 430,
        angle: -0.15,
        options: { width: 220 }
      },
      // Guide plank leading to Goal
      {
        id: 'plank-4',
        type: 'plank',
        x: 820,
        y: 520,
        angle: 0.22,
        options: { width: 180, height: 16 }
      },
      // Goal
      {
        id: 'goal-1',
        type: 'goal',
        x: 930,
        y: 540,
        angle: 0
      }
    ]
  },
  {
    id: 'course-2',
    title: '2. バネと芯の空中ジャンプ',
    description: '坂を下りたビー玉がバネで勢いよく跳ね上がり、空中のトイレットペーパー芯をくぐり抜けてゴールします。',
    gadgets: [
      // Start Gate
      {
        id: 'start-2',
        type: 'start_gate',
        x: 100,
        y: 100,
        angle: 0
      },
      // Player Marble
      {
        id: 'marble-2',
        type: 'marble',
        x: 100,
        y: 80,
        angle: 0,
        options: { isPlayerBall: true, color: '#ef4444', radius: 14 }
      },
      // Steep Slope Plank
      {
        id: 'plank-jump-1',
        type: 'plank',
        x: 180,
        y: 190,
        angle: 0.65, // ~37 deg steep slope
        options: { width: 240, height: 16 }
      },
      // Bouncing Spring Pad
      {
        id: 'spring-1',
        type: 'spring',
        x: 280,
        y: 320,
        angle: -0.45, // angled bounce up-right
        options: { width: 70, height: 26, restitution: 1.6 }
      },
      // Suspended Toilet Paper Tube in midair
      {
        id: 'tube-1',
        type: 'toilet_paper_tube',
        x: 480,
        y: 220,
        angle: 0.42,
        options: { width: 170, height: 48 }
      },
      // Intermediate ramp
      {
        id: 'plank-jump-2',
        type: 'plank',
        x: 640,
        y: 330,
        angle: 0.28,
        options: { width: 190, height: 16 }
      },
      // Rubber band trampoline
      {
        id: 'rubber-1',
        type: 'rubber_band',
        x: 770,
        y: 380,
        angle: -0.3,
        options: { width: 110 }
      },
      // Goal
      {
        id: 'goal-2',
        type: 'goal',
        x: 880,
        y: 430,
        angle: 0
      }
    ]
  },
  {
    id: 'course-3',
    title: '3. 風と水と磁石のからくり大実験',
    description: '水槽をポチャリと通過し、扇風機の突風で飛ばされ、磁石の力で引き寄せられてゴールするダイナミックなコースです。',
    gadgets: [
      // Start Gate
      {
        id: 'start-3',
        type: 'start_gate',
        x: 100,
        y: 90,
        angle: 0
      },
      // Player Marble
      {
        id: 'marble-3',
        type: 'marble',
        x: 100,
        y: 70,
        angle: 0,
        options: { isPlayerBall: true, color: '#ef4444', radius: 14 }
      },
      // Entry Plank
      {
        id: 'plank-w1',
        type: 'plank',
        x: 180,
        y: 160,
        angle: 0.45,
        options: { width: 200, height: 16 }
      },
      // Water Pool
      {
        id: 'water-1',
        type: 'water',
        x: 320,
        y: 260,
        angle: 0,
        options: { width: 160, height: 80 }
      },
      // Floor under water
      {
        id: 'plank-w-bottom',
        type: 'plank',
        x: 320,
        y: 305,
        angle: 0.1,
        options: { width: 180, height: 14 }
      },
      // Electric Fan blowing to the right
      {
        id: 'fan-1',
        type: 'fan',
        x: 430,
        y: 340,
        angle: -0.15 // slightly tilted up-right
      },
      // Wind channel ramp
      {
        id: 'plank-wind',
        type: 'plank',
        x: 560,
        y: 340,
        angle: 0.05,
        options: { width: 220, height: 16 }
      },
      // Powerful Magnet pulling the ball upward
      {
        id: 'magnet-1',
        type: 'magnet',
        x: 690,
        y: 240,
        angle: 0.8,
        options: { power: 1.5, polarity: 'attract' }
      },
      // Ramp under magnet
      {
        id: 'plank-mag',
        type: 'plank',
        x: 720,
        y: 370,
        angle: 0.35,
        options: { width: 180, height: 16 }
      },
      // Goal
      {
        id: 'goal-3',
        type: 'goal',
        x: 850,
        y: 430,
        angle: 0
      }
    ]
  }
];
