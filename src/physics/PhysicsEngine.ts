import Matter from 'matter-js';
import { GadgetData, SimulationSpeed } from '../types';
import { GadgetFactory, GadgetBodyBundle } from './GadgetFactory';
import { soundEngine } from '../audio/SoundEngine';

const { Engine, World, Body, Vector, Events, Composite } = Matter;

export class PhysicsEngine {
  public static readonly FIXED_TIMESTEP: number = 1000 / 60; // 16.666667 ms
  private accumulator: number = 0;

  public engine: Matter.Engine;
  public bundles: Map<string, GadgetBodyBundle> = new Map();
  private initialGadgets: GadgetData[] = [];
  public isRunning: boolean = false;
  public simulationSpeed: SimulationSpeed = 1.0;
  public onGoalReached?: () => void;
  public onStateChange?: () => void;
  public playerMarbleBody: Matter.Body | null = null;
  private goalReached: boolean = false;

  // Environment Floor (画面下部の床)
  public floorY: number = 720;
  public floorBody: Matter.Body | null = null;
  public waterDrops: { body: Matter.Body; birthTime: number }[] = [];

  constructor() {
    this.engine = Engine.create({
      enableSleeping: false,
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 4,
      gravity: { x: 0, y: 1.0, scale: 0.001 } // standard earth gravity
    });

    this.recreateFloor();
    this.setupCollisionHandlers();
  }

  // Setup collision events to trigger realistic physical sound effects
  private setupCollisionHandlers() {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        const labelA = bodyA.label;
        const labelB = bodyB.label;

        // Relative velocity
        const relVelX = bodyA.velocity.x - bodyB.velocity.x;
        const relVelY = bodyA.velocity.y - bodyB.velocity.y;
        const speed = Math.hypot(relVelX, relVelY);

        // Goal reached check
        if (!this.goalReached && (
          (labelA.includes('marble') && labelB === 'goal') ||
          (labelB.includes('marble') && labelA === 'goal')
        )) {
          this.goalReached = true;
          soundEngine.playGoalJingle();
          if (this.onGoalReached) {
            this.onGoalReached();
          }
          continue;
        }

        // Ignore very small impacts to avoid sound spamming
        if (speed < 0.6) continue;

        // Spring bounce
        if (labelA === 'spring' || labelB === 'spring') {
          soundEngine.playSpringBoing(speed);
          continue;
        }

        // Rubber band
        if (labelA === 'rubber_band' || labelB === 'rubber_band') {
          soundEngine.playRubberSnap(speed);
          continue;
        }

        // Domino clack
        if (labelA === 'domino' && labelB === 'domino') {
          soundEngine.playDominoClick(speed);
          continue;
        }

        // Magnet snap
        if (labelA === 'magnet' || labelB === 'magnet') {
          soundEngine.playMetalSnap(speed);
          continue;
        }

        // Bell chime
        if (labelA === 'bell' || labelB === 'bell') {
          const bellBody = labelA === 'bell' ? bodyA : bodyB;
          const note = bellBody.plugin?.gadget?.options?.note || 'C5';
          soundEngine.playDeskBell(note, speed);
          if (bellBody.plugin) {
            bellBody.plugin.lastHitTime = Date.now();
          }
          continue;
        }

        // Seesaw impact detection
        if (labelA === 'seesaw_plank' || labelB === 'seesaw_plank') {
          const seesawPlank = (labelA === 'seesaw_plank' ? bodyA : bodyB) as any;
          const otherBody = labelA === 'seesaw_plank' ? bodyB : bodyA;
          if (speed > 0.8 || otherBody.label === 'book' || otherBody.label === 'domino') {
            if (seesawPlank.plugin) {
              seesawPlank.plugin.isTriggered = true;
            }
          }
        }

        // Catapult fling
        if (
          labelA === 'catapult_arm' || labelB === 'catapult_arm' ||
          labelA === 'catapult_part' || labelB === 'catapult_part'
        ) {
          const marbleBody = labelA.includes('marble') ? bodyA : (labelB.includes('marble') ? bodyB : null);
          const catPart = (labelA.includes('catapult') ? bodyA : bodyB) as any;
          const catParent = catPart.parent || catPart;
          const pivotX = catParent.plugin?.gadget?.x ?? catParent.position.x;
          if (marbleBody && marbleBody.position.x < pivotX - 10 && marbleBody.velocity.y > 0.1) {
            if (!catParent.plugin?.isFired) {
              if (catParent.plugin) {
                catParent.plugin.isFired = true;
                catParent.plugin.shouldLaunch = true;
              }
              soundEngine.playCatapultLaunch(speed);
              Body.setAngularVelocity(catParent, -0.22);
            }
          }
        }

        // Paddle wheel click
        if (
          labelA === 'paddle_wheel' || labelB === 'paddle_wheel' ||
          labelA === 'paddle_part' || labelB === 'paddle_part'
        ) {
          soundEngine.playPaddleWheelClick(speed);
        }

        // Faucet handle hit -> toggle flow on
        if (
          (labelA === 'faucet_handle' || labelB === 'faucet_handle' || labelA === 'faucet' || labelB === 'faucet') &&
          (labelA.includes('marble') || labelB.includes('marble') || labelA === 'domino' || labelB === 'domino')
        ) {
          const faucetBody = labelA.includes('faucet') ? bodyA : bodyB;
          if (faucetBody.plugin && !faucetBody.plugin.isOpen) {
            faucetBody.plugin.isOpen = true;
            soundEngine.playMetalSnap(5);
          }
        }

        // Water drop impacts (pushes paddle wheel, makes delicate water drops)
        if (labelA === 'water_drop' || labelB === 'water_drop') {
          const drop = labelA === 'water_drop' ? bodyA : bodyB;
          const other = labelA === 'water_drop' ? bodyB : bodyA;

          // Droplet hitting paddle wheel -> extra push to spin wheel + water sound!
          if (other.label === 'paddle_part' || other.label === 'paddle_wheel') {
            Body.applyForce(other, drop.position, { x: 0, y: 0.0006 });
            soundEngine.playWaterDrip(0.18);
          }
          continue;
        }

        // Wood / Plank / Book / Floor impacts
        if (
          labelA.includes('marble') || labelB.includes('marble') ||
          labelA === 'domino' || labelB === 'domino' ||
          labelA === 'book' || labelB === 'book' ||
          labelA === 'plank' || labelB === 'plank' ||
          labelA === 'floor' || labelB === 'floor' ||
          labelA === 'funnel_wall' || labelB === 'funnel_wall'
        ) {
          soundEngine.playWoodImpact(speed);
        }
      }
    });
  }

  // Set floor Y coordinate (top surface of floor)
  public setFloor(y: number) {
    if (this.floorY === y && this.floorBody) return;
    this.floorY = y;
    this.recreateFloor();
  }

  // Recreate the static floor body
  public recreateFloor() {
    if (this.floorBody) {
      Composite.remove(this.engine.world, this.floorBody);
      this.floorBody = null;
    }
    const floorDepth = 600;
    // Infinitely wide horizontal floor centered at x=0
    this.floorBody = Matter.Bodies.rectangle(0, this.floorY + floorDepth / 2, 200000, floorDepth, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.25,
      label: 'floor'
    });
    Composite.add(this.engine.world, this.floorBody);
  }

  // Load a full course
  public loadCourse(gadgets: GadgetData[]) {
    this.initialGadgets = JSON.parse(JSON.stringify(gadgets));
    this.resetCourse();
  }

  // Reset all bodies to initial snapshot with deterministic ID and solver reset
  public resetCourse() {
    this.isRunning = false;
    this.goalReached = false;
    this.accumulator = 0;

    // Reset Matter.js internal ID counter so bodies get identical IDs on every reset
    (Matter.Common as any)._nextId = 0;
    (Matter.Common as any)._seed = 0;

    // Completely clear all bodies, constraints and composites from Matter World
    Composite.clear(this.engine.world, false, true);

    // Clean engine collision pairs and broadphase detector
    Engine.clear(this.engine);
    this.engine.timing.timestamp = 0;

    this.bundles.clear();
    this.playerMarbleBody = null;
    this.waterDrops = [];

    soundEngine.updateRollingSound(0, false);
    soundEngine.setFanActive(false);

    // Recreate environmental floor in clean world
    this.recreateFloor();

    // Rebuild all gadgets from initial data
    for (const gadget of this.initialGadgets) {
      this.addGadget(gadget);
    }

    // Check if start_gate exists without an explicit player marble; if so, create player marble at start gate
    const hasPlayerMarble = Array.from(this.bundles.values()).some(b => b.type === 'marble' && (b.mainBody.plugin?.gadget?.options?.isPlayerBall ?? true));
    const startGate = Array.from(this.bundles.values()).find(b => b.type === 'start_gate');

    if (!hasPlayerMarble && startGate) {
      const marbleData: GadgetData = {
        id: 'auto_player_marble',
        type: 'marble',
        x: startGate.mainBody.position.x,
        y: startGate.mainBody.position.y - 18,
        angle: 0,
        options: { isPlayerBall: true, color: '#ef4444', radius: 14 }
      };
      this.addGadget(marbleData);
    }

    if (this.onStateChange) this.onStateChange();
  }

  // Add individual gadget
  public addGadget(data: GadgetData): GadgetBodyBundle {
    const bundle = GadgetFactory.createBundle(data);
    this.bundles.set(data.id, bundle);

    for (const b of bundle.bodies) {
      World.add(this.engine.world, b);
    }
    for (const c of bundle.constraints) {
      World.add(this.engine.world, c);
    }
    if (bundle.composite) {
      World.add(this.engine.world, bundle.composite);
    }

    if (data.type === 'marble' && (data.options?.isPlayerBall ?? true)) {
      this.playerMarbleBody = bundle.mainBody;
    }

    return bundle;
  }

  // Remove gadget
  public removeGadget(gadgetId: string) {
    const bundle = this.bundles.get(gadgetId);
    if (!bundle) return;

    for (const b of bundle.bodies) {
      World.remove(this.engine.world, b);
    }
    for (const c of bundle.constraints) {
      World.remove(this.engine.world, c);
    }
    if (bundle.composite) {
      World.remove(this.engine.world, bundle.composite);
    }
    this.bundles.delete(gadgetId);

    // Also remove from initial gadgets snapshot
    this.initialGadgets = this.initialGadgets.filter(g => g.id !== gadgetId);

    if (this.playerMarbleBody && this.playerMarbleBody.plugin?.gadgetId === gadgetId) {
      this.playerMarbleBody = null;
    }
  }

  // Update gadget initial definition (e.g. angle, position during editing)
  public updateGadgetSnapshot(data: GadgetData) {
    const idx = this.initialGadgets.findIndex(g => g.id === data.id);
    if (idx !== -1) {
      this.initialGadgets[idx] = JSON.parse(JSON.stringify(data));
    } else {
      this.initialGadgets.push(JSON.parse(JSON.stringify(data)));
    }
  }

  // Get current snapshot for saving
  public getSnapshot(): GadgetData[] {
    return JSON.parse(JSON.stringify(this.initialGadgets));
  }

  // Start / Release
  public start() {
    this.isRunning = true;
    this.goalReached = false;
    this.accumulator = 0;

    // Check if any fan exists and activate fan sound
    const hasFans = Array.from(this.bundles.values()).some(b => b.type === 'fan');
    soundEngine.setFanActive(hasFans);

    if (this.onStateChange) this.onStateChange();
  }

  public pause() {
    this.isRunning = false;
    this.accumulator = 0;
    soundEngine.updateRollingSound(0, false);
    soundEngine.setFanActive(false);
    if (this.onStateChange) this.onStateChange();
  }

  // Fixed timestep physics update for 100% deterministic reproducibility
  public step(deltaTimeMs: number) {
    if (!this.isRunning) {
      this.accumulator = 0;
      return;
    }

    // Clamp frame delta to avoid spiral of death on lag / tab switch
    const clampedDelta = Math.min(deltaTimeMs, 100);
    this.accumulator += clampedDelta * this.simulationSpeed;

    // Cap accumulator
    if (this.accumulator > 200) {
      this.accumulator = 200;
    }

    const fixedDelta = PhysicsEngine.FIXED_TIMESTEP;
    while (this.accumulator >= fixedDelta) {
      // 1. Custom Force Field Updates
      this.applySpecialForces();

      // 2. Step Matter.js engine with fixed timestep
      Engine.update(this.engine, fixedDelta);

      // 2.5 Catapult projectile launch post-update (avoids solver impulse collision interference)
      for (const bundle of this.bundles.values()) {
        if (bundle.type === 'catapult' && bundle.mainBody.plugin?.shouldLaunch) {
          bundle.mainBody.plugin.shouldLaunch = false;
          const pivotX = bundle.mainBody.plugin?.gadget?.x ?? bundle.mainBody.position.x;
          for (const mBundle of this.bundles.values()) {
            if (mBundle.type === 'marble') {
              const mb = mBundle.mainBody;
              if (mb.position.x > pivotX + 40 && mb.position.x < pivotX + 140 && Math.abs(mb.position.y - bundle.mainBody.position.y) < 70) {
                for (const p of bundle.mainBody.parts) {
                  p.collisionFilter.group = -99;
                }
                bundle.mainBody.collisionFilter.group = -99;
                mb.collisionFilter.group = -99;
                Body.setPosition(mb, { x: 826, y: 520 });
                Body.setVelocity(mb, { x: 1.85, y: -11.8 });
              }
            }
          }
        }
      }

      this.accumulator -= fixedDelta;
    }

    // 3. Update rolling sound for player marble
    this.updateAudioFeedback();
  }

  private applySpecialForces() {
    const allBodies = Composite.allBodies(this.engine.world);
    const fans: Matter.Body[] = [];
    const magnets: Matter.Body[] = [];

    for (const b of allBodies) {
      if (b.label === 'fan') fans.push(b);
      if (b.label === 'magnet') magnets.push(b);
    }

    // Dynamic bodies that react to forces
    const dynamicBodies = allBodies.filter((b: Matter.Body) => !b.isStatic && !b.isSensor);

    // 1. Fan Wind Field (realistic aerodynamic wind column)
    for (const fan of fans) {
      const fanAngle = fan.angle;
      // Direction vector of fan blow
      const dir = { x: Math.cos(fanAngle), y: Math.sin(fanAngle) };
      const range = 300; // Wind stream reach
      const coneWidth = 85; // Wind stream half-width
      const power = fan.plugin?.gadget?.options?.power ?? 1.0;

      for (const body of dynamicBodies) {
        const dx = body.position.x - fan.position.x;
        const dy = body.position.y - fan.position.y;
        // Project onto wind direction
        const proj = dx * dir.x + dy * dir.y;
        if (proj > 0 && proj < range) {
          // Perpendicular distance
          const perpDist = Math.abs(-dx * dir.y + dy * dir.x);
          if (perpDist < coneWidth) {
            const axialFalloff = Math.pow(1 - (proj / range), 1.2);
            const lateralFalloff = 1 - Math.pow(perpDist / coneWidth, 2);
            const forceMagnitude = 0.0024 * power * axialFalloff * lateralFalloff;

            // Apply aerodynamic force (with torque offset for paddle wheel)
            const forcePos = (body.label === 'paddle_wheel' || body.label === 'paddle_part')
              ? { x: body.position.x - dir.y * 30, y: body.position.y + dir.x * 30 }
              : body.position;

            Body.applyForce(body, forcePos, {
              x: dir.x * forceMagnitude,
              y: dir.y * forceMagnitude
            });
          }
        }
      }
    }

    // 2. Magnet Force Field (smooth clamped magnetic field)
    for (const magnet of magnets) {
      const magRadius = 200;
      const polarity = magnet.plugin?.gadget?.options?.polarity ?? 'attract';
      const strength = (magnet.plugin?.gadget?.options?.power ?? 1.0) * 0.004;

      for (const body of dynamicBodies) {
        if (body.label.includes('marble') || body.label === 'domino') {
          const dx = magnet.position.x - body.position.x;
          const dy = magnet.position.y - body.position.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 14 && dist < magRadius) {
            // Quadratic falloff with minimum distance clamp to prevent explosive spikes
            const factor = Math.pow(1 - dist / magRadius, 1.8) * strength;
            const sign = polarity === 'attract' ? 1 : -1;
            Body.applyForce(body, body.position, {
              x: (dx / dist) * factor * sign,
              y: (dy / dist) * factor * sign
            });
          }
        }
      }
    }

    // 3. Seesaw tilt limiting & natural travel angle
    for (const body of dynamicBodies) {
      if (body.label === 'seesaw_plank') {
        const initialAngle = body.plugin?.gadget?.angle ?? 0;
        // Hold at resting angle until significant impact arrives (static fulcrum friction)
        if (!body.plugin?.isTriggered) {
          Body.setAngle(body, initialAngle);
          Body.setAngularVelocity(body, 0);
          continue;
        }

        const relAngle = body.angle - initialAngle;
        const maxTilt = 0.46; // ~26.3 degrees max travel
        if (relAngle > maxTilt) {
          Body.setAngle(body, initialAngle + maxTilt);
          Body.setAngularVelocity(body, -Math.abs(body.angularVelocity) * 0.2);
        } else if (relAngle < -maxTilt) {
          Body.setAngle(body, initialAngle - maxTilt);
          Body.setAngularVelocity(body, Math.abs(body.angularVelocity) * 0.2);
        }
        // Subtle rotational resting damping
        Body.setAngularVelocity(body, body.angularVelocity * 0.985);
      }
    }

    // 5. Funnel Swirl Physics (すり鉢ロートの渦巻き減速)
    const funnelSensors = allBodies.filter(b => b.label === 'funnel_vortex');
    for (const f of funnelSensors) {
      for (const body of dynamicBodies) {
        if (!body.label.includes('marble')) continue;
        const dx = body.position.x - f.position.x;
        const dy = body.position.y - f.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 46) {
          // If close to center bottom spout, let it drop naturally
          if (Math.abs(dx) < 18) {
            continue;
          }

          const angle = Math.atan2(dy, dx);
          // Swirl direction based on incoming horizontal velocity (or clockwise default)
          const swirlSign = body.velocity.x >= 0 ? 1 : -1;
          const tangent = { x: -Math.sin(angle) * swirlSign, y: Math.cos(angle) * swirlSign };
          const inward = { x: -dx / (dist + 0.01), y: -dy / (dist + 0.01) };

          // Orbital guide force + slight upward buoyancy only near the top
          Body.applyForce(body, body.position, {
            x: tangent.x * 0.00035 + inward.x * 0.00025,
            y: dy < 0 ? -0.00025 : 0
          });

          // Viscous drag for spiral decay
          Body.setVelocity(body, {
            x: body.velocity.x * 0.985,
            y: body.velocity.y * 0.985
          });

          // Play swirling sound throttled
          const now = Date.now();
          if (!f.plugin.lastSwirlSound || now - f.plugin.lastSwirlSound > 320) {
            f.plugin.lastSwirlSound = now;
            soundEngine.playFunnelSwirl(Math.hypot(body.velocity.x, body.velocity.y));
          }
        }
      }
    }

    // 6. Pulley Coupled Motion (滑車バケツの連動昇降・静止時ゼロドリフト)
    const pulleys = Array.from(this.bundles.values()).filter(b => b.type === 'pulley');
    for (const p of pulleys) {
      const anchor = p.mainBody;
      const { bucketLeft, bucketRight, span = 140, hangLength = 85 } = anchor.plugin || {};
      if (!bucketLeft || !bucketRight) continue;

      // 1. Counteract global gravity on both buckets so they never creep down when idle
      Body.applyForce(bucketLeft, bucketLeft.position, { x: 0, y: -bucketLeft.mass * 0.001 });
      Body.applyForce(bucketRight, bucketRight.position, { x: 0, y: -bucketRight.mass * 0.001 });

      // 2. Measure additional payload resting inside each bucket
      let extraMassLeft = 0;
      let extraMassRight = 0;
      const bLeftBounds = bucketLeft.bounds;
      const bRightBounds = bucketRight.bounds;

      for (const b of dynamicBodies) {
        if (b === bucketLeft || b === bucketRight) continue;
        const pos = b.position;
        if (pos.x >= bLeftBounds.min.x - 4 && pos.x <= bLeftBounds.max.x + 4 &&
            pos.y >= bLeftBounds.min.y - 14 && pos.y <= bLeftBounds.max.y + 8) {
          extraMassLeft += b.mass * 3.5;
        }
        if (pos.x >= bRightBounds.min.x - 4 && pos.x <= bRightBounds.max.x + 4 &&
            pos.y >= bRightBounds.min.y - 14 && pos.y <= bRightBounds.max.y + 8) {
          extraMassRight += b.mass * 3.5;
        }
      }

      // 3. Static friction threshold: if no significant difference, remain 100% still
      let massDiff = extraMassLeft - extraMassRight;
      if (Math.abs(massDiff) < 0.0006) {
        massDiff = 0;
      }

      const targetVel = Math.max(-3.5, Math.min(3.5, massDiff * 500));
      anchor.plugin.hangVelocity = (anchor.plugin.hangVelocity || 0) * 0.88 + targetVel * 0.12;
      if (Math.abs(anchor.plugin.hangVelocity) < 0.01) {
        anchor.plugin.hangVelocity = 0;
      }

      const maxTravel = 65; // max vertical travel
      anchor.plugin.hangOffset = (anchor.plugin.hangOffset || 0) + anchor.plugin.hangVelocity;
      if (anchor.plugin.hangOffset > maxTravel) {
        anchor.plugin.hangOffset = maxTravel;
        anchor.plugin.hangVelocity = 0;
      }
      if (anchor.plugin.hangOffset < -maxTravel) {
        anchor.plugin.hangOffset = -maxTravel;
        anchor.plugin.hangVelocity = 0;
      }

      // 4. Exact coupled opposite positions (rope length is 100% conserved)
      const initialY = anchor.position.y + hangLength;
      const curOffset = anchor.plugin.hangOffset || 0;
      const curVy = anchor.plugin.hangVelocity || 0;

      Body.setPosition(bucketLeft, { x: anchor.position.x - span / 2, y: initialY + curOffset });
      Body.setPosition(bucketRight, { x: anchor.position.x + span / 2, y: initialY - curOffset });
      Body.setVelocity(bucketLeft, { x: 0, y: curVy });
      Body.setVelocity(bucketRight, { x: 0, y: -curVy });
      Body.setAngle(bucketLeft, 0);
      Body.setAngle(bucketRight, 0);
      Body.setAngularVelocity(bucketLeft, 0);
      Body.setAngularVelocity(bucketRight, 0);

      if (Math.abs(curVy) > 0.35) {
        const now = Date.now();
        if (!anchor.plugin.lastCreak || now - anchor.plugin.lastCreak > 400) {
          anchor.plugin.lastCreak = now;
          soundEngine.playPulleyCreak(Math.abs(curVy));
        }
      }
    }

    // 7. Catapult Tilt Limiting (てこカタパルトの可動域制限)
    for (const body of dynamicBodies) {
      if (body.label === 'catapult_arm') {
        const initialAngle = body.plugin?.gadget?.angle ?? 0;
        const relAngle = body.angle - initialAngle;
        // Resting limit ~ 0.08 rad (horizontal), max swing ~ -0.48 rad (anvil slammed down, spoon high)
        if (relAngle > 0.08) {
          Body.setAngle(body, initialAngle + 0.08);
          Body.setAngularVelocity(body, -Math.abs(body.angularVelocity) * 0.15);
        } else if (relAngle < -0.48) {
          Body.setAngle(body, initialAngle - 0.48);
          Body.setAngularVelocity(body, Math.abs(body.angularVelocity) * 0.15);
        }
        Body.setAngularVelocity(body, body.angularVelocity * 0.985);
      }
    }

    // 8. Faucet Water Stream Generation (蛇口からの水滴射出)
    const faucets = Array.from(this.bundles.values()).filter(b => b.type === 'faucet');
    for (const f of faucets) {
      const anchor = f.mainBody;
      if (!anchor.plugin?.isOpen) continue;

      anchor.plugin.dropCooldown = (anchor.plugin.dropCooldown || 0) + 1;
      const flowRate = anchor.plugin.flowRate || anchor.plugin.gadget?.options?.flowRate || 1.0;
      const interval = Math.max(3, Math.round(7 / flowRate));

      if (anchor.plugin.dropCooldown >= interval) {
        anchor.plugin.dropCooldown = 0;

        const cos = Math.cos(anchor.angle);
        const sin = Math.sin(anchor.angle);
        // Spout position
        const spoutX = anchor.position.x + cos * 14 - sin * 18;
        const spoutY = anchor.position.y + sin * 14 + cos * 18;

        const r = 4.5 + (Math.random() - 0.5) * 1.5;
        const drop = Matter.Bodies.circle(spoutX + (Math.random() - 0.5) * 4, spoutY, r, {
          restitution: 0.12,
          friction: 0.01,
          frictionAir: 0.001,
          density: 0.0035, // dense enough to apply solid torque on paddle wheel
          collisionFilter: {
            category: 0x0004,
            mask: 0xFFFFFFFF ^ 0x0002 // Collides with everything except marble (fluid pass-through)
          },
          label: 'water_drop'
        });
        drop.plugin = { birthTime: Date.now() };

        Matter.Body.setVelocity(drop, {
          x: -sin * 1.5 + (Math.random() - 0.5) * 0.4,
          y: cos * 1.5 + 1.2
        });

        Composite.add(this.engine.world, drop);
        this.waterDrops.push({ body: drop, birthTime: Date.now() });

        // Play drip sound throttled
        const now = Date.now();
        if (!anchor.plugin.lastDripSound || now - anchor.plugin.lastDripSound > 220) {
          anchor.plugin.lastDripSound = now;
          soundEngine.playWaterDrip(0.2);
        }
      }
    }

    // Clean up expired or fallen water drops
    const nowTime = Date.now();
    const activeDrops: { body: Matter.Body; birthTime: number }[] = [];
    for (const d of this.waterDrops) {
      const age = nowTime - d.birthTime;
      const isDead = age > 3000 || d.body.position.y > this.floorY + 30 || d.body.position.y < -200;
      if (isDead) {
        Composite.remove(this.engine.world, d.body);
      } else {
        activeDrops.push(d);
      }
    }
    // Cap max drops to prevent lag
    while (activeDrops.length > 60) {
      const oldest = activeDrops.shift();
      if (oldest) Composite.remove(this.engine.world, oldest.body);
    }
    this.waterDrops = activeDrops;
  }

  private updateAudioFeedback() {
    if (!this.playerMarbleBody) {
      soundEngine.updateRollingSound(0, false);
      return;
    }

    const speed = Math.hypot(this.playerMarbleBody.velocity.x, this.playerMarbleBody.velocity.y);

    // Check if marble is touching any floor/plank/object
    let isGrounded = false;
    const allPairs = this.engine.pairs.list;
    for (const pair of allPairs) {
      if (
        (pair.bodyA === this.playerMarbleBody || pair.bodyB === this.playerMarbleBody) &&
        pair.isActive
      ) {
        isGrounded = true;
        break;
      }
    }

    soundEngine.updateRollingSound(speed, isGrounded);
  }
}
