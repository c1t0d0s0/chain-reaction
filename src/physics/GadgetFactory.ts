import Matter from 'matter-js';
import { GadgetData } from '../types';

const { Bodies, Body, Composite, Constraint } = Matter;

export interface GadgetBodyBundle {
  gadgetId: string;
  type: string;
  bodies: Matter.Body[];
  constraints: Matter.Constraint[];
  composite?: Matter.Composite;
  mainBody: Matter.Body; // used for position tracking / selection
}

export class GadgetFactory {
  // Red Marble (ビー玉)
  public static createMarble(data: GadgetData): GadgetBodyBundle {
    const r = data.options?.radius || 14;
    const isPlayer = data.options?.isPlayerBall ?? true;
    const color = data.options?.color || (isPlayer ? '#ef4444' : '#3b82f6');

    const marble = Bodies.circle(data.x, data.y, r, {
      restitution: data.options?.restitution ?? 0.65,
      friction: data.options?.friction ?? 0.05,
      frictionAir: 0.001,
      density: 0.004, // nice solid marble weight
      label: isPlayer ? 'player_marble' : 'marble',
      render: { fillStyle: color }
    });
    marble.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'marble',
      bodies: [marble],
      constraints: [],
      mainBody: marble
    };
  }

  // Start Gate (スタート地点)
  public static createStartGate(data: GadgetData): GadgetBodyBundle {
    // Draggable visual holder and spawn point for player marble
    const gateBody = Bodies.rectangle(data.x, data.y, 44, 30, {
      isStatic: true,
      isSensor: true,
      label: 'start_gate',
    });
    gateBody.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'start_gate',
      bodies: [gateBody],
      constraints: [],
      mainBody: gateBody
    };
  }

  // Goal (ゴール地点)
  public static createGoal(data: GadgetData): GadgetBodyBundle {
    const w = 60;
    const h = 50;
    // Sensor box to detect marble arrival
    const goalSensor = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: true,
      isSensor: true,
      label: 'goal',
    });
    goalSensor.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'goal',
      bodies: [goalSensor],
      constraints: [],
      mainBody: goalSensor
    };
  }

  // Wood Plank (板)
  public static createPlank(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 180;
    const h = data.options?.height || 16;
    const isStatic = data.options?.isStatic ?? true;

    const plank = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic,
      friction: data.options?.friction ?? 0.1,
      restitution: data.options?.restitution ?? 0.25,
      angle: data.angle,
      label: 'plank'
    });
    plank.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'plank',
      bodies: [plank],
      constraints: [],
      mainBody: plank
    };
  }

  // Book (本)
  public static createBook(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 32;
    const h = data.options?.height || 90;

    const book = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: data.options?.isStatic ?? false,
      friction: 0.4,
      restitution: 0.1,
      density: 0.003,
      angle: data.angle,
      label: 'book'
    });
    book.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'book',
      bodies: [book],
      constraints: [],
      mainBody: book
    };
  }

  // Domino (ドミノ)
  public static createDomino(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 12;
    const h = data.options?.height || 54;

    const domino = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: false,
      friction: 0.35,
      frictionStatic: 0.5,
      restitution: 0.15,
      density: 0.002,
      angle: data.angle,
      label: 'domino'
    });
    domino.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'domino',
      bodies: [domino],
      constraints: [],
      mainBody: domino
    };
  }

  // Spring / Bouncer (バネ)
  public static createSpring(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 60;
    const h = data.options?.height || 26;

    const springPad = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: true,
      restitution: data.options?.restitution ?? 1.5, // High bounce!
      friction: 0.02,
      angle: data.angle,
      label: 'spring'
    });
    springPad.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'spring',
      bodies: [springPad],
      constraints: [],
      mainBody: springPad
    };
  }

  // Seesaw (シーソー)
  public static createSeesaw(data: GadgetData): GadgetBodyBundle {
    const plankW = data.options?.width || 220;
    const plankH = 14;

    const plank = Bodies.rectangle(data.x, data.y, plankW, plankH, {
      friction: 0.25,
      restitution: 0.1,
      density: 0.002,
      angle: data.angle,
      label: 'seesaw_plank'
    });

    // Fulcrum (pivot pin)
    const pivot = Bodies.polygon(data.x, data.y + 18, 3, 16, {
      isStatic: true,
      label: 'seesaw_pivot'
    });

    const joint = Constraint.create({
      pointA: { x: data.x, y: data.y },
      bodyB: plank,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1
    });

    plank.plugin = { gadgetId: data.id, gadget: data };
    pivot.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'seesaw',
      bodies: [plank, pivot],
      constraints: [joint],
      mainBody: plank
    };
  }

  // Paper Cup (紙コップ - U-shaped hollow container)
  public static createPaperCup(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 56;
    const h = data.options?.height || 64;
    const thickness = 8;

    // Bottom plate
    const bottom = Bodies.rectangle(data.x, data.y + h / 2 - thickness / 2, w, thickness, {
      friction: 0.3,
      restitution: 0.2,
      label: 'paper_cup_part'
    });
    // Left wall
    const leftWall = Bodies.rectangle(data.x - w / 2 + thickness / 2, data.y, thickness, h, {
      friction: 0.3,
      restitution: 0.2,
      label: 'paper_cup_part'
    });
    // Right wall
    const rightWall = Bodies.rectangle(data.x + w / 2 - thickness / 2, data.y, thickness, h, {
      friction: 0.3,
      restitution: 0.2,
      label: 'paper_cup_part'
    });

    const cup = Body.create({
      parts: [bottom, leftWall, rightWall],
      friction: 0.3,
      restitution: 0.1,
      density: 0.0012, // light paper cup
      label: 'paper_cup'
    });
    Body.setAngle(cup, data.angle);
    cup.plugin = { gadgetId: data.id, gadget: data };
    bottom.plugin = cup.plugin;
    leftWall.plugin = cup.plugin;
    rightWall.plugin = cup.plugin;

    return {
      gadgetId: data.id,
      type: 'paper_cup',
      bodies: [cup],
      constraints: [],
      mainBody: cup
    };
  }

  // Toilet Paper Tube (トイレットペーパーの芯 - Hollow chute/tunnel)
  public static createToiletPaperTube(data: GadgetData): GadgetBodyBundle {
    const length = data.options?.width || 160;
    const diameter = data.options?.height || 46;
    const thickness = 8;
    const isStatic = data.options?.isStatic ?? true;

    // Top wall
    const topWall = Bodies.rectangle(data.x, data.y - diameter / 2, length, thickness, {
      friction: 0.05,
      restitution: 0.2,
      label: 'tube_part'
    });
    // Bottom wall
    const botWall = Bodies.rectangle(data.x, data.y + diameter / 2, length, thickness, {
      friction: 0.05,
      restitution: 0.2,
      label: 'tube_part'
    });

    const tube = Body.create({
      parts: [topWall, botWall],
      isStatic,
      friction: 0.05,
      label: 'toilet_paper_tube'
    });
    Body.setAngle(tube, data.angle);
    tube.plugin = { gadgetId: data.id, gadget: data };
    topWall.plugin = tube.plugin;
    botWall.plugin = tube.plugin;


    return {
      gadgetId: data.id,
      type: 'toilet_paper_tube',
      bodies: [tube],
      constraints: [],
      mainBody: tube
    };
  }

  // Rubber Band (輪ゴム - Elastic trampoline/string)
  public static createRubberBand(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 100;
    const h = 10;

    const band = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: true,
      restitution: 1.25, // bouncy elasticity
      friction: 0.1,
      angle: data.angle,
      label: 'rubber_band'
    });
    band.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'rubber_band',
      bodies: [band],
      constraints: [],
      mainBody: band
    };
  }

  // Pendulum / String with suspended weight (糸・振り子)
  public static createPendulum(data: GadgetData): GadgetData & GadgetBodyBundle {
    const length = data.options?.length || 130;
    const bobRadius = 18;

    const anchor = Bodies.circle(data.x, data.y, 6, {
      isStatic: true,
      isSensor: true,
      label: 'pendulum_anchor'
    });

    const bobX = data.x + length * Math.sin(data.angle);
    const bobY = data.y + length * Math.cos(data.angle);

    const bob = Bodies.circle(bobX, bobY, bobRadius, {
      density: 0.008, // heavy bowling-like bob
      restitution: 0.4,
      friction: 0.1,
      label: 'pendulum_bob'
    });

    const stringConstraint = Constraint.create({
      bodyA: anchor,
      bodyB: bob,
      length,
      stiffness: 0.95
    });

    bob.plugin = { gadgetId: data.id, gadget: data };
    anchor.plugin = { gadgetId: data.id, gadget: data };

    return {
      ...data,
      gadgetId: data.id,
      type: 'pendulum',
      bodies: [anchor, bob],
      constraints: [stringConstraint],
      mainBody: anchor
    };
  }

  // Electric Fan (扇風機 - blows wind in direction of angle)
  public static createFan(data: GadgetData): GadgetBodyBundle {
    const base = Bodies.rectangle(data.x, data.y, 44, 44, {
      isStatic: true,
      angle: data.angle,
      label: 'fan'
    });
    base.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'fan',
      bodies: [base],
      constraints: [],
      mainBody: base
    };
  }

  // Magnet (磁石 - applies attractive or repulsive force)
  public static createMagnet(data: GadgetData): GadgetBodyBundle {
    const magnet = Bodies.rectangle(data.x, data.y, 48, 32, {
      isStatic: true,
      angle: data.angle,
      label: 'magnet'
    });
    magnet.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'magnet',
      bodies: [magnet],
      constraints: [],
      mainBody: magnet
    };
  }

  // Water Pool (水槽・水たまり - Buoyancy & fluid drag zone)
  public static createWater(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 160;
    const h = data.options?.height || 90;

    const water = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: true,
      isSensor: true,
      label: 'water'
    });
    water.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'water',
      bodies: [water],
      constraints: [],
      mainBody: water
    };
  }

  // Generic dispatcher
  public static createBundle(data: GadgetData): GadgetBodyBundle {
    switch (data.type) {
      case 'marble':
        return this.createMarble(data);
      case 'start_gate':
        return this.createStartGate(data);
      case 'goal':
        return this.createGoal(data);
      case 'plank':
        return this.createPlank(data);
      case 'book':
        return this.createBook(data);
      case 'domino':
        return this.createDomino(data);
      case 'spring':
        return this.createSpring(data);
      case 'seesaw':
        return this.createSeesaw(data);
      case 'paper_cup':
        return this.createPaperCup(data);
      case 'toilet_paper_tube':
        return this.createToiletPaperTube(data);
      case 'rubber_band':
        return this.createRubberBand(data);
      case 'pendulum':
        return this.createPendulum(data);
      case 'fan':
        return this.createFan(data);
      case 'magnet':
        return this.createMagnet(data);
      case 'water':
        return this.createWater(data);
      default:
        return this.createPlank(data);
    }
  }
}
