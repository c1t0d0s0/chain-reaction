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

    // Glass marble characteristics: crisp bounce, very low rolling resistance
    const marble = Bodies.circle(data.x, data.y, r, {
      restitution: data.options?.restitution ?? 0.55,
      friction: data.options?.friction ?? 0.02,
      frictionAir: 0.0008,
      density: 0.004, // nice solid marble weight
      collisionFilter: {
        category: 0x0002,
        mask: 0xFFFFFFFF ^ 0x0004
      },
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

    // Pine/oak wood plank: slight bounce, smooth rolling surface
    const plank = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic,
      friction: data.options?.friction ?? 0.04,
      angle: data.angle,
      label: 'plank'
    });
    plank.restitution = data.options?.restitution ?? 0.22;
    plank.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'plank',
      bodies: [plank],
      constraints: [],
      mainBody: plank
    };
  }

  // Brick (レンガ - heavy ceramic terracotta block)
  public static createBrick(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 72;
    const h = data.options?.height || 36;

    const density = data.options?.density || 0.012;
    const friction = data.options?.friction || 0.85;

    // Heavy red brick: solid weight, strong friction, minimal bounce
    const brick = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: data.options?.isStatic ?? false,
      friction: friction,
      frictionStatic: 1.5,
      restitution: 0.08,
      density: density,
      angle: data.angle,
      label: 'brick'
    });
    brick.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'brick',
      bodies: [brick],
      constraints: [],
      mainBody: brick
    };
  }

  // Domino (ドミノ)
  public static createDomino(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 11;
    const h = data.options?.height || 54;

    // Domino piece: balanced pivot base and energetic momentum transfer for continuous chain reaction
    const domino = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: false,
      friction: 0.35,
      frictionStatic: 0.6,
      restitution: 0.35,
      density: 0.0035,
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

    // High energy pinball-style bouncer
    const springPad = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: true,
      friction: 0.01,
      angle: data.angle,
      label: 'spring'
    });
    springPad.restitution = data.options?.restitution ?? 1.65; // Dynamic crisp boing bounce
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

    // Balanced seesaw board: responds smoothly to marble weight with high-grip wooden surface
    const plank = Bodies.rectangle(data.x, data.y, plankW, plankH, {
      friction: 0.8,
      frictionStatic: 1.5,
      restitution: 0.08,
      density: 0.005,
      angle: data.angle,
      label: 'seesaw_plank'
    });

    // Fulcrum (pivot pin)
    const pivot = Bodies.polygon(data.x, data.y + 18, 3, 16, {
      isStatic: true,
      isSensor: true,
      label: 'seesaw_pivot'
    });

    const joint = Constraint.create({
      pointA: { x: data.x, y: data.y },
      bodyB: plank,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 0.98,
      damping: 0.02
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
      restitution: 0.12,
      label: 'paper_cup_part'
    });
    // Left wall
    const leftWall = Bodies.rectangle(data.x - w / 2 + thickness / 2, data.y, thickness, h, {
      friction: 0.3,
      restitution: 0.12,
      label: 'paper_cup_part'
    });
    // Right wall
    const rightWall = Bodies.rectangle(data.x + w / 2 - thickness / 2, data.y, thickness, h, {
      friction: 0.3,
      restitution: 0.12,
      label: 'paper_cup_part'
    });

    // Realistic feather-light paper cup
    const cup = Body.create({
      parts: [bottom, leftWall, rightWall],
      friction: 0.25,
      frictionStatic: 0.4,
      restitution: 0.1,
      density: 0.0008, // Very light paper cup
      label: 'paper_cup'
    });
    Body.setAngle(cup, data.angle);
    const initialWater = data.options?.waterAmount ?? 0;
    cup.plugin = {
      gadgetId: data.id,
      gadget: data,
      waterLevel: initialWater,
      baseMass: cup.mass
    };
    if (initialWater > 0) {
      Body.setMass(cup, cup.mass + initialWater * 3.5);
    }
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

    // Top wall - very smooth inner surface
    const topWall = Bodies.rectangle(data.x, data.y - diameter / 2, length, thickness, {
      friction: 0.01,
      restitution: 0.15,
      label: 'tube_part'
    });
    // Bottom wall - low friction chute
    const botWall = Bodies.rectangle(data.x, data.y + diameter / 2, length, thickness, {
      friction: 0.01,
      restitution: 0.15,
      label: 'tube_part'
    });

    const tube = Body.create({
      parts: [topWall, botWall],
      isStatic,
      friction: 0.01,
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

    // Snappy elastic band
    const band = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: true,
      friction: 0.05,
      angle: data.angle,
      label: 'rubber_band'
    });
    band.restitution = data.options?.restitution ?? 1.35; // High bouncy elasticity
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

    // Heavy iron weight with minimal air damping for sustained periodic swing
    const bob = Bodies.circle(bobX, bobY, bobRadius, {
      density: 0.009, // Solid iron bob
      restitution: 0.45,
      friction: 0.08,
      frictionAir: 0.0003,
      label: 'pendulum_bob'
    });

    const stringConstraint = Constraint.create({
      bodyA: anchor,
      bodyB: bob,
      length,
      stiffness: 0.98,
      damping: 0.001
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

  // Kitchen Funnel / Spiral Bowl (すり鉢ロート・じょうご)
  public static createFunnel(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 130;
    const h = data.options?.height || 75;
    const thickness = 8;
    const holeWidth = 44;

    // Left sloped guide
    const leftSlope = Bodies.rectangle(
      data.x - w / 4 - holeWidth / 4,
      data.y - h / 4,
      w * 0.46,
      thickness,
      {
        angle: 0.58,
        friction: 0.02,
        restitution: 0.15,
        isStatic: true,
        label: 'funnel_wall'
      }
    );

    // Right sloped guide
    const rightSlope = Bodies.rectangle(
      data.x + w / 4 + holeWidth / 4,
      data.y - h / 4,
      w * 0.46,
      thickness,
      {
        angle: -0.58,
        friction: 0.02,
        restitution: 0.15,
        isStatic: true,
        label: 'funnel_wall'
      }
    );

    // Inner vortex swirl sensor area
    const vortexSensor = Bodies.circle(data.x, data.y - 6, 36, {
      isStatic: true,
      isSensor: true,
      label: 'funnel_vortex'
    });

    const funnel = Body.create({
      parts: [leftSlope, rightSlope, vortexSensor],
      isStatic: true,
      label: 'funnel'
    });
    Body.setAngle(funnel, data.angle);
    funnel.plugin = { gadgetId: data.id, gadget: data };
    leftSlope.plugin = funnel.plugin;
    rightSlope.plugin = funnel.plugin;
    vortexSensor.plugin = funnel.plugin;

    return {
      gadgetId: data.id,
      type: 'funnel',
      bodies: [funnel],
      constraints: [],
      mainBody: funnel
    };
  }

  // Desk Bell / Glockenspiel Bar (卓上ベル・鉄琴プレート)
  public static createBell(data: GadgetData): GadgetBodyBundle {
    const w = data.options?.width || 48;
    const h = data.options?.height || 36;

    // Metallic dome/bar body (sensor so marbles chime smoothly without getting blocked)
    const bell = Bodies.rectangle(data.x, data.y, w, h, {
      isStatic: true,
      isSensor: true,
      restitution: 0.75, // crisp ping rebound
      friction: 0.1,
      angle: data.angle,
      label: 'bell'
    });
    bell.plugin = { gadgetId: data.id, gadget: data };

    return {
      gadgetId: data.id,
      type: 'bell',
      bodies: [bell],
      constraints: [],
      mainBody: bell
    };
  }

  // Paddle Wheel (回転パドル水車)
  public static createPaddleWheel(data: GadgetData): GadgetBodyBundle {
    const spokeCount = data.options?.spokes || 4;
    const diameter = 96;
    const thickness = 12;

    const parts: Matter.Body[] = [];
    // Hub
    const hub = Bodies.circle(data.x, data.y, 15, {
      label: 'paddle_part'
    });
    parts.push(hub);

    // Spokes / Paddles
    if (spokeCount === 6) {
      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI) / 3;
        const bar = Bodies.rectangle(data.x, data.y, diameter, thickness, {
          angle: ang,
          label: 'paddle_part'
        });
        parts.push(bar);
      }
    } else {
      // 4 Spokes: Cross
      const hBar = Bodies.rectangle(data.x, data.y, diameter, thickness, {
        label: 'paddle_part'
      });
      const vBar = Bodies.rectangle(data.x, data.y, thickness, diameter, {
        label: 'paddle_part'
      });
      parts.push(hBar, vBar);
    }

    const wheel = Body.create({
      parts,
      friction: 0.05,
      frictionStatic: 0.1,
      restitution: 0.35,
      density: 0.0022,
      label: 'paddle_wheel'
    });
    Body.setAngle(wheel, data.angle);

    const joint = Constraint.create({
      pointA: { x: data.x, y: data.y },
      bodyB: wheel,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1.0,
      damping: 0.003
    });

    wheel.plugin = { gadgetId: data.id, gadget: data };
    parts.forEach(p => (p.plugin = wheel.plugin));

    return {
      gadgetId: data.id,
      type: 'paddle_wheel',
      bodies: [wheel],
      constraints: [joint],
      mainBody: wheel
    };
  }

  // Pulley & Bucket Elevator (滑車バケツ・エレベーター)
  public static createPulley(data: GadgetData): GadgetBodyBundle {
    const span = data.options?.span || 140;
    const halfSpan = span / 2;
    const hangLength = 85;

    // Top fixed pulley wheel anchor
    const pulleyAnchor = Bodies.circle(data.x, data.y, 16, {
      isStatic: true,
      label: 'pulley_wheel'
    });

    // Left Bucket (U-shaped cup)
    const bW = 46;
    const bH = 34;
    const th = 6;

    const leftBottom = Bodies.rectangle(data.x - halfSpan, data.y + hangLength + bH / 2 - th / 2, bW, th, { label: 'pulley_bucket_left' });
    const leftW1 = Bodies.rectangle(data.x - halfSpan - bW / 2 + th / 2, data.y + hangLength, th, bH, { label: 'pulley_bucket_left' });
    const leftW2 = Bodies.rectangle(data.x - halfSpan + bW / 2 - th / 2, data.y + hangLength, th, bH, { label: 'pulley_bucket_left' });

    const bucketLeft = Body.create({
      parts: [leftBottom, leftW1, leftW2],
      friction: 0.2,
      density: 0.0018,
      label: 'pulley_bucket_left'
    });

    // Right Bucket (starts slightly higher or same height)
    const rightBottom = Bodies.rectangle(data.x + halfSpan, data.y + hangLength + bH / 2 - th / 2, bW, th, { label: 'pulley_bucket_right' });
    const rightW1 = Bodies.rectangle(data.x + halfSpan - bW / 2 + th / 2, data.y + hangLength, th, bH, { label: 'pulley_bucket_right' });
    const rightW2 = Bodies.rectangle(data.x + halfSpan + bW / 2 - th / 2, data.y + hangLength, th, bH, { label: 'pulley_bucket_right' });

    const bucketRight = Body.create({
      parts: [rightBottom, rightW1, rightW2],
      friction: 0.2,
      density: 0.0018,
      label: 'pulley_bucket_right'
    });

    pulleyAnchor.plugin = {
      gadgetId: data.id,
      gadget: data,
      bucketLeft,
      bucketRight,
      hangLength,
      hangOffset: 0,
      hangVelocity: 0,
      initialY: data.y + hangLength,
      span,
      totalLength: hangLength * 2
    };
    bucketLeft.plugin = pulleyAnchor.plugin;
    bucketRight.plugin = pulleyAnchor.plugin;

    return {
      gadgetId: data.id,
      type: 'pulley',
      bodies: [pulleyAnchor, bucketLeft, bucketRight],
      constraints: [],
      mainBody: pulleyAnchor
    };
  }

  // Spoon Lever Catapult (てこカタパルト・跳ね上げスプーン)
  public static createCatapult(data: GadgetData): GadgetBodyBundle {
    // Fulcrum base
    const fulcrum = Bodies.polygon(data.x, data.y + 18, 3, 16, {
      isStatic: true,
      isSensor: true,
      label: 'catapult_fulcrum'
    });

    // Lever arm: Pivot at (0, 0)
    // Left anvil side: -50px, Right spoon side: +85px
    const armBar = Bodies.rectangle(data.x + 18, data.y, 160, 10, {
      friction: 0.2,
      label: 'catapult_part'
    });
    // Heavy wooden anvil pad on the short left side
    const anvilPad = Bodies.rectangle(data.x - 52, data.y - 8, 36, 16, {
      friction: 0.6,
      density: 0.006, // heavy solid block
      label: 'catapult_part'
    });
    // Cupped spoon on the long right side
    const spoonBottom = Bodies.rectangle(data.x + 90, data.y - 4, 30, 6, { label: 'catapult_part' });
    const spoonLip = Bodies.rectangle(data.x + 104, data.y - 10, 6, 16, { label: 'catapult_part' });

    const catapult = Body.create({
      parts: [armBar, anvilPad, spoonBottom, spoonLip],
      friction: 0.2,
      frictionStatic: 0.4,
      restitution: 0.12,
      density: 0.0025,
      label: 'catapult_arm'
    });
    const localPivot = { x: data.x - catapult.position.x, y: data.y - catapult.position.y };
    if (data.angle) {
      (Body as any).rotate(catapult, data.angle, { x: data.x, y: data.y });
    }

    const joint = Constraint.create({
      pointA: { x: data.x, y: data.y },
      bodyB: catapult,
      pointB: localPivot,
      length: 0,
      stiffness: 0.98,
      damping: 0.015
    });

    fulcrum.plugin = { gadgetId: data.id, gadget: data };
    catapult.plugin = fulcrum.plugin;

    return {
      gadgetId: data.id,
      type: 'catapult',
      bodies: [catapult, fulcrum],
      constraints: [joint],
      mainBody: catapult
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
      case 'brick':
      case 'book':
        return this.createBrick(data);
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
      case 'funnel':
        return this.createFunnel(data);
      case 'bell':
        return this.createBell(data);
      case 'paddle_wheel':
        return this.createPaddleWheel(data);
      case 'pulley':
        return this.createPulley(data);
      case 'catapult':
        return this.createCatapult(data);
      case 'faucet':
        return this.createFaucet(data);
      default:
        return this.createPlank(data);
    }
  }

  // Faucet (蛇口 - 水流・水滴の供給口)
  public static createFaucet(data: GadgetData): GadgetBodyBundle {
    const pipePart = Bodies.rectangle(data.x - 6, data.y, 40, 16, {
      label: 'faucet_pipe'
    });
    const spoutPart = Bodies.rectangle(data.x + 14, data.y + 12, 14, 18, {
      label: 'faucet_spout'
    });
    const handlePart = Bodies.circle(data.x - 2, data.y - 14, 12, {
      label: 'faucet_handle'
    });

    const faucet = Body.create({
      parts: [pipePart, spoutPart, handlePart],
      isStatic: true,
      label: 'faucet'
    });
    Body.setAngle(faucet, data.angle);

    faucet.plugin = {
      gadgetId: data.id,
      gadget: data,
      isOpen: data.options?.autoFlow ?? true,
      flowRate: data.options?.flowRate ?? 1.0,
      dropCooldown: 0
    };
    pipePart.plugin = faucet.plugin;
    spoutPart.plugin = faucet.plugin;
    handlePart.plugin = faucet.plugin;

    return {
      gadgetId: data.id,
      type: 'faucet',
      bodies: [faucet],
      constraints: [],
      mainBody: faucet
    };
  }
}

