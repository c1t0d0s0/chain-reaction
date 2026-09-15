import { CourseData } from '../types';

export const DEFAULT_COURSES: CourseData[] = [
  {
    id: 'course-1',
    title: '1. 基本の坂道とドミノ連鎖',
    titleEn: '1. Basic Ramps & Domino Cascade',
    description: '坂道を転がったビー玉がドミノを倒し、レンガを押し倒してシーソーを動かす基本コースです。',
    descriptionEn: 'A starter course where a rolling marble triggers dominoes and tips a seesaw to reach the goal.',
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
      // Second Slope Plank (leads down towards domino shelf)
      {
        id: 'plank-2',
        type: 'plank',
        x: 280,
        y: 265,
        angle: 0.32,
        options: { width: 200, height: 16 }
      },
      // Flat Shelf for Dominoes
      {
        id: 'plank-3',
        type: 'plank',
        x: 440,
        y: 345,
        angle: 0.02,
        options: { width: 220, height: 16 }
      },
      // Domino Chain (6 pieces spaced at 23px for snappy pat-pat cascade)
      { id: 'dom-1', type: 'domino', x: 376, y: 310, angle: 0 },
      { id: 'dom-2', type: 'domino', x: 399, y: 310, angle: 0 },
      { id: 'dom-3', type: 'domino', x: 422, y: 310, angle: 0 },
      { id: 'dom-4', type: 'domino', x: 445, y: 310, angle: 0 },
      { id: 'dom-5', type: 'domino', x: 468, y: 310, angle: 0 },
      { id: 'dom-6', type: 'domino', x: 491, y: 310, angle: 0 },
      // Standing Brick
      {
        id: 'brick-1',
        type: 'brick',
        x: 516,
        y: 300,
        angle: 0,
        options: { width: 18, height: 65 }
      },
      // Seesaw below the book
      {
        id: 'seesaw-1',
        type: 'seesaw',
        x: 560,
        y: 410,
        angle: 0,
        options: { width: 220 }
      },
      // Second marble on seesaw triggered by the book
      {
        id: 'marble-seesaw',
        type: 'marble',
        x: 620,
        y: 390,
        angle: 0,
        options: { isPlayerBall: true, color: '#ef4444', radius: 14 }
      },
      // Guide plank leading to Goal
      {
        id: 'plank-4',
        type: 'plank',
        x: 740,
        y: 465,
        angle: 0.25,
        options: { width: 180, height: 16 }
      },
      // Goal
      {
        id: 'goal-1',
        type: 'goal',
        x: 840,
        y: 495,
        angle: 0
      }
    ]
  },
  {
    id: 'course-2',
    title: '2. バネと芯の空中ジャンプ',
    titleEn: '2. Springs & Tubes Aerial Jumps',
    description: '坂を下りたビー玉がバネで勢いよく跳ね上がり、空中のトイレットペーパー芯をくぐり抜けてゴールします。',
    descriptionEn: 'A dynamic course with high-impulse spring bouncers, paper tube tunnels, and aerial jumps.',
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
        x: 295,
        y: 315,
        angle: -0.45, // angled bounce up-right
        options: { width: 70, height: 26, restitution: 1.6 }
      },
      // Suspended Toilet Paper Tube in midair
      {
        id: 'tube-1',
        type: 'toilet_paper_tube',
        x: 460,
        y: 210,
        angle: 0.50,
        options: { width: 150, height: 56 }
      },
      // Intermediate ramp
      {
        id: 'plank-jump-2',
        type: 'plank',
        x: 640,
        y: 340,
        angle: 0.28,
        options: { width: 190, height: 16 }
      },
      // Rubber band trampoline
      {
        id: 'rubber-1',
        type: 'rubber_band',
        x: 780,
        y: 380,
        angle: -0.35,
        options: { width: 110 }
      },
      // Goal
      {
        id: 'goal-2',
        type: 'goal',
        x: 880,
        y: 420,
        angle: 0
      }
    ]
  },
  {
    id: 'course-3',
    title: '3. 風と水と磁石のからくり大実験',
    titleEn: '3. Wind, Water & Magnet Contraption',
    description: '蛇口から注がれる涼しげな水滴のシャワーを浴びて水車を回し、扇風機の突風で飛ばされ、磁石の力で引き寄せられてゴールするダイナミックなコースです。',
    descriptionEn: 'A multi-force course featuring aerodynamic wind, magnetic pull, and water-filled paper cups tipping a seesaw.',
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
      // Faucet pouring water drops onto paddle wheel
      {
        id: 'faucet-3',
        type: 'faucet',
        x: 280,
        y: 70,
        angle: 0,
        options: { autoFlow: true, flowRate: 1.2 }
      },
      // Paddle Wheel turned by water drops
      {
        id: 'wheel-3',
        type: 'paddle_wheel',
        x: 310,
        y: 145,
        angle: 0.2,
        options: { spokes: 4 }
      },
      // Water slide ramp under paddle wheel leading to fan
      {
        id: 'plank-w2',
        type: 'plank',
        x: 320,
        y: 280,
        angle: 0.25,
        options: { width: 170, height: 16 }
      },
      // Electric Fan blowing to the right
      {
        id: 'fan-1',
        type: 'fan',
        x: 430,
        y: 340,
        angle: -0.1,
        options: { power: 0.75 }
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
        x: 740,
        y: 380,
        angle: 0.25,
        options: { width: 180, height: 16 }
      },
      // Goal
      {
        id: 'goal-3',
        type: 'goal',
        x: 830,
        y: 325,
        angle: 0
      }
    ]
  },
  {
    id: 'course-4',
    title: '4. ピタゴラからくり大実験 (新登場ギミック)',
    titleEn: '4. The Ultimate Contraption',
    description: '回転水車、音階ベル（ド・ミ・ソ♪）、すり鉢ロートの渦巻き、てこカタパルトの跳ね上げが連鎖する大実験コースです。',
    descriptionEn: 'An elaborate chain reaction connecting rotary paddle wheels, musical bells, spiral funnels, and catapults!',
    gadgets: [
      // Start Gate
      {
        id: 'start-4',
        type: 'start_gate',
        x: 100,
        y: 110,
        angle: 0
      },
      // Player Marble
      {
        id: 'marble-4-1',
        type: 'marble',
        x: 100,
        y: 85,
        angle: 0,
        options: { isPlayerBall: true, color: '#ef4444', radius: 14 }
      },
      // First slope plank leading to paddle wheel
      {
        id: 'plank-4-1',
        type: 'plank',
        x: 180,
        y: 160,
        angle: 0.38,
        options: { width: 190, height: 16 }
      },
      // Faucet pouring water onto paddle wheel
      {
        id: 'faucet-4-1',
        type: 'faucet',
        x: 260,
        y: 70,
        angle: 0,
        options: { autoFlow: true, flowRate: 1.2 }
      },
      // Paddle Wheel
      {
        id: 'wheel-4-1',
        type: 'paddle_wheel',
        x: 285,
        y: 140,
        angle: 0.2,
        options: { spokes: 4 }
      },
      // Guide plank under paddle wheel and bells leading into funnel
      {
        id: 'plank-4-2',
        type: 'plank',
        x: 470,
        y: 325,
        angle: 0.28,
        options: { width: 390, height: 16 }
      },
      // Musical Bell 1: ド (C5)
      {
        id: 'bell-c5',
        type: 'bell',
        x: 415,
        y: 295,
        angle: 0,
        options: { note: 'C5' }
      },
      // Musical Bell 2: ミ (E5)
      {
        id: 'bell-e5',
        type: 'bell',
        x: 475,
        y: 320,
        angle: 0,
        options: { note: 'E5' }
      },
      // Musical Bell 3: ソ (G5)
      {
        id: 'bell-g5',
        type: 'bell',
        x: 535,
        y: 345,
        angle: 0,
        options: { note: 'G5' }
      },
      // Kitchen Funnel (すり鉢ロート)
      {
        id: 'funnel-4-1',
        type: 'funnel',
        x: 680,
        y: 440,
        angle: 0,
        options: { width: 130, height: 75 }
      },
      // Catapult below funnel outlet
      // Catapult pivot at (730, 570): left anvil pad is around x=678 (directly under funnel spout x=680)
      {
        id: 'catapult-4-1',
        type: 'catapult',
        x: 730,
        y: 570,
        angle: 0
      },
      // Golden marble placed on the catapult spoon
      {
        id: 'marble-gold',
        type: 'marble',
        x: 820,
        y: 545,
        angle: 0,
        options: { isPlayerBall: true, color: '#f59e0b', radius: 14 }
      },
      // Receiving ramp for catapulted ball
      {
        id: 'plank-4-4',
        type: 'plank',
        x: 1000,
        y: 500,
        angle: 0.28,
        options: { width: 240, height: 16 }
      },
      // High Bell: 高ド (C6) on the ramp
      {
        id: 'bell-c6',
        type: 'bell',
        x: 1030,
        y: 480,
        angle: 0,
        options: { note: 'C6' }
      },
      // Goal
      {
        id: 'goal-4',
        type: 'goal',
        x: 1110,
        y: 525,
        angle: 0
      }
    ]
  }
];
