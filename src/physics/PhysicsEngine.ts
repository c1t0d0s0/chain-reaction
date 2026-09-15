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

  // Environment Room Boundaries (床・左右の壁)
  public floorY: number = 660;
  public leftWallX: number = 20;
  public rightWallX: number = 1240;
  public floorBody: Matter.Body | null = null;
  public leftWallBody: Matter.Body | null = null;
  public rightWallBody: Matter.Body | null = null;
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
          if (speed > 0.8 || otherBody.label === 'brick' || otherBody.label === 'book' || otherBody.label === 'domino') {
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
          if (marbleBody && marbleBody.position.x < pivotX + 15 && marbleBody.velocity.y > 0.1) {
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

        // Wood / Plank / Book / Floor / Wall impacts
        if (
          labelA.includes('marble') || labelB.includes('marble') ||
          labelA === 'domino' || labelB === 'domino' ||
          labelA === 'brick' || labelB === 'brick' ||
          labelA === 'book' || labelB === 'book' ||
          labelA === 'plank' || labelB === 'plank' ||
          labelA === 'floor' || labelB === 'floor' ||
          labelA === 'wall' || labelB === 'wall' ||
          labelA === 'funnel_wall' || labelB === 'funnel_wall'
        ) {
          soundEngine.playWoodImpact(speed);
        }
      }
    });
  }

  // Set room boundaries (left wall X, right wall X, floor top surface Y)
  public setRoomBounds(left: number, right: number, floor: number) {
    if (this.leftWallX === left && this.rightWallX === right && this.floorY === floor && this.floorBody && this.leftWallBody && this.rightWallBody) {
      return;
    }
    this.leftWallX = left;
    this.rightWallX = right;
    this.floorY = floor;
    this.recreateBoundaries();
  }

  // Set floor Y coordinate (top surface of floor) - backward compatibility
  public setFloor(y: number) {
    if (this.floorY === y && this.floorBody) return;
    this.floorY = y;
    this.recreateBoundaries();
  }

  // Recreate the static floor body - backward compatibility
  public recreateFloor() {
    this.recreateBoundaries();
  }

  // Recreate all room boundaries (floor and left/right physical walls)
  public recreateBoundaries() {
    if (this.floorBody) {
      Composite.remove(this.engine.world, this.floorBody);
      this.floorBody = null;
    }
    if (this.leftWallBody) {
      Composite.remove(this.engine.world, this.leftWallBody);
      this.leftWallBody = null;
    }
    if (this.rightWallBody) {
      Composite.remove(this.engine.world, this.rightWallBody);
      this.rightWallBody = null;
    }

    const floorDepth = 600;
    // Infinitely wide horizontal floor centered at room midpoint
    const roomCenterX = (this.leftWallX + this.rightWallX) / 2;
    this.floorBody = Matter.Bodies.rectangle(roomCenterX, this.floorY + floorDepth / 2, 200000, floorDepth, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.25,
      label: 'floor'
    });

    const wallThickness = 400;
    const wallHeight = 4000;
    // Left physical wall (inner edge at leftWallX)
    this.leftWallBody = Matter.Bodies.rectangle(
      this.leftWallX - wallThickness / 2,
      this.floorY - wallHeight / 2 + 200,
      wallThickness,
      wallHeight,
      {
        isStatic: true,
        friction: 0.2,
        restitution: 0.35,
        label: 'wall'
      }
    );

    // Right physical wall (inner edge at rightWallX)
    this.rightWallBody = Matter.Bodies.rectangle(
      this.rightWallX + wallThickness / 2,
      this.floorY - wallHeight / 2 + 200,
      wallThickness,
      wallHeight,
      {
        isStatic: true,
        friction: 0.2,
        restitution: 0.35,
        label: 'wall'
      }
    );

    Composite.add(this.engine.world, [this.floorBody, this.leftWallBody, this.rightWallBody]);
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
        const maxTilt = 0.40; // ~23 degrees natural travel
        if (relAngle > maxTilt) {
          Body.setAngle(body, initialAngle + maxTilt);
          if (body.angularVelocity > 0) {
            Body.setAngularVelocity(body, 0);
          }
        } else if (relAngle < -maxTilt) {
          Body.setAngle(body, initialAngle - maxTilt);
          if (body.angularVelocity < 0) {
            Body.setAngularVelocity(body, 0);
          }
        }
        // Subtle rotational resting damping
        Body.setAngularVelocity(body, body.angularVelocity * 0.985);

        // Rest stabilization for non-marbles on seesaw plank (prevents numerical micro-slip down the slope)
        const plankHalfW = (body.plugin?.gadget?.options?.width ?? 220) / 2;
        const uX = Math.cos(body.angle);
        const uY = Math.sin(body.angle);

        for (const other of dynamicBodies) {
          if (other === body || other.label.includes('marble') || other.label.includes('water_drop')) continue;
          const dx = other.position.x - body.position.x;
          const dy = other.position.y - body.position.y;
          const distAlongPlank = dx * uX + dy * uY;
          const distNormalPlank = -dx * uY + dy * uX;

          // If object is resting on top of the plank within its length
          if (Math.abs(distAlongPlank) < plankHalfW + 10 && distNormalPlank < 0 && distNormalPlank > -40) {
            const relVx = other.velocity.x - body.velocity.x;
            const relVy = other.velocity.y - body.velocity.y;
            const vTangent = relVx * uX + relVy * uY;
            if (Math.abs(vTangent) < 2.0) {
              Body.setVelocity(other, {
                x: other.velocity.x - vTangent * uX * 0.9,
                y: other.velocity.y - vTangent * uY * 0.9
              });
            }
          }
        }
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
      const {
        bucketLeft,
        bucketRight,
        leftBottomPart,
        rightBottomPart,
        span = 140,
        hangLength = 85,
        bW = 86,
        bH = 46,
        wallTh = 6,
        bottomTh = 18
      } = anchor.plugin || {};
      if (!bucketLeft || !bucketRight) continue;

      if (anchor.plugin.waterLevelLeft === undefined) anchor.plugin.waterLevelLeft = 0;
      if (anchor.plugin.waterLevelRight === undefined) anchor.plugin.waterLevelRight = 0;

      // 1. Water Drop Collection into Buckets
      const innerW = bW - 2 * (anchor.plugin?.wallTh || 6);
      const innerFloorLeftY = leftBottomPart ? leftBottomPart.bounds.min.y : (bucketLeft.position.y + 15);
      const topRimLeftY = bucketLeft.position.y - bH / 2;

      const innerFloorRightY = rightBottomPart ? rightBottomPart.bounds.min.y : (bucketRight.position.y + 15);
      const topRimRightY = bucketRight.position.y - bH / 2;

      let newDropsAdded = 0;
      for (const d of this.waterDrops) {
        if ((d as any).isAbsorbed || d.body.plugin?.fromBucket) continue;
        const pos = d.body.position;

        // Left Bucket Cavity Check
        if (Math.abs(pos.x - bucketLeft.position.x) <= innerW / 2 + 3 &&
            pos.y >= topRimLeftY - 8 && pos.y <= innerFloorLeftY + 4) {
          (d as any).isAbsorbed = true;
          Composite.remove(this.engine.world, d.body);

          if (anchor.plugin.waterLevelLeft < 1.0) {
            anchor.plugin.waterLevelLeft = Math.min(1.0, anchor.plugin.waterLevelLeft + 0.035);
            newDropsAdded++;
          } else {
            // Already full -> queue overflow drop
            anchor.plugin.overflowLeftBuffer = (anchor.plugin.overflowLeftBuffer || 0) + 1;
          }
        }

        // Right Bucket Cavity Check
        if (Math.abs(pos.x - bucketRight.position.x) <= innerW / 2 + 3 &&
            pos.y >= topRimRightY - 8 && pos.y <= innerFloorRightY + 4) {
          (d as any).isAbsorbed = true;
          Composite.remove(this.engine.world, d.body);

          if (anchor.plugin.waterLevelRight < 1.0) {
            anchor.plugin.waterLevelRight = Math.min(1.0, anchor.plugin.waterLevelRight + 0.035);
            newDropsAdded++;
          } else {
            anchor.plugin.overflowRightBuffer = (anchor.plugin.overflowRightBuffer || 0) + 1;
          }
        }
      }

      if (newDropsAdded > 0) {
        const now = Date.now();
        if (!anchor.plugin.lastDripSound || now - anchor.plugin.lastDripSound > 160) {
          anchor.plugin.lastDripSound = now;
          soundEngine.playWaterDrip(0.25);
        }
      }

      // 2. Overflow Spilling from Buckets
      anchor.plugin.overflowCooldown = (anchor.plugin.overflowCooldown || 0) + 1;
      let isOverflowingLeft = false;
      let isOverflowingRight = false;

      if ((anchor.plugin.overflowLeftBuffer || 0) > 0) {
        isOverflowingLeft = true;
        while (anchor.plugin.overflowLeftBuffer > 0) {
          anchor.plugin.overflowLeftBuffer--;
          if (anchor.plugin.overflowCooldown >= 2) {
            anchor.plugin.overflowCooldown = 0;
            const dir = Math.random() < 0.5 ? -1 : 1;
            this.spawnPulleyOverflowDrop(bucketLeft, {
              x: bucketLeft.position.x + dir * (bW / 2 - 2),
              y: bucketLeft.position.y - bH / 2 + 2,
              outward: dir
            });
          }
        }
      }

      if ((anchor.plugin.overflowRightBuffer || 0) > 0) {
        isOverflowingRight = true;
        while (anchor.plugin.overflowRightBuffer > 0) {
          anchor.plugin.overflowRightBuffer--;
          if (anchor.plugin.overflowCooldown >= 2) {
            anchor.plugin.overflowCooldown = 0;
            const dir = Math.random() < 0.5 ? -1 : 1;
            this.spawnPulleyOverflowDrop(bucketRight, {
              x: bucketRight.position.x + dir * (bW / 2 - 2),
              y: bucketRight.position.y - bH / 2 + 2,
              outward: dir
            });
          }
        }
      }

      anchor.plugin.isOverflowingLeft = isOverflowingLeft;
      anchor.plugin.isOverflowingRight = isOverflowingRight;
      bucketLeft.plugin.waterLevel = anchor.plugin.waterLevelLeft;
      bucketRight.plugin.waterLevel = anchor.plugin.waterLevelRight;
      bucketLeft.plugin.isOverflowing = isOverflowingLeft;
      bucketRight.plugin.isOverflowing = isOverflowingRight;

      // 3. Measure additional payload resting inside each bucket (including accumulated water)
      const waterMassLeft = (anchor.plugin.waterLevelLeft || 0) * 8.0;
      const waterMassRight = (anchor.plugin.waterLevelRight || 0) * 8.0;

      let extraMassLeft = waterMassLeft * 3.5;
      let extraMassRight = waterMassRight * 3.5;
      const bLeftBounds = bucketLeft.bounds;
      const bRightBounds = bucketRight.bounds;

      const payloadsLeft: Matter.Body[] = [];
      const payloadsRight: Matter.Body[] = [];

      for (const b of dynamicBodies) {
        if (b === bucketLeft || b === bucketRight || b.label === 'water_drop') continue;
        const pos = b.position;
        if (pos.x >= bLeftBounds.min.x - 4 && pos.x <= bLeftBounds.max.x + 4 &&
            pos.y >= bLeftBounds.min.y - 20 && pos.y <= bLeftBounds.max.y + 16) {
          extraMassLeft += b.mass * 3.5;
          payloadsLeft.push(b);
        }
        if (pos.x >= bRightBounds.min.x - 4 && pos.x <= bRightBounds.max.x + 4 &&
            pos.y >= bRightBounds.min.y - 20 && pos.y <= bRightBounds.max.y + 16) {
          extraMassRight += b.mass * 3.5;
          payloadsRight.push(b);
        }
      }

      // 4. Counteract gravity and support payload weight on buckets (maintains rope suspension without sag)
      const grav = 0.001;
      Body.applyForce(bucketLeft, bucketLeft.position, { x: 0, y: -(bucketLeft.mass + extraMassLeft / 3.5) * grav });
      Body.applyForce(bucketRight, bucketRight.position, { x: 0, y: -(bucketRight.mass + extraMassRight / 3.5) * grav });

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

      // Smooth deceleration near travel limits
      if (anchor.plugin.hangOffset > maxTravel - 12 && anchor.plugin.hangVelocity > 0) {
        anchor.plugin.hangVelocity *= 0.65;
      }
      if (anchor.plugin.hangOffset < -maxTravel + 12 && anchor.plugin.hangVelocity < 0) {
        anchor.plugin.hangVelocity *= 0.65;
      }

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
      const initialLeftY = anchor.plugin.initialLeftY ?? (anchor.position.y + hangLength);
      const initialRightY = anchor.plugin.initialRightY ?? (anchor.position.y + hangLength);
      const curOffset = anchor.plugin.hangOffset || 0;
      const curVy = anchor.plugin.hangVelocity || 0;

      Body.setPosition(bucketLeft, { x: anchor.position.x - span / 2, y: initialLeftY + curOffset });
      Body.setPosition(bucketRight, { x: anchor.position.x + span / 2, y: initialRightY - curOffset });
      Body.setVelocity(bucketLeft, { x: 0, y: curVy });
      Body.setVelocity(bucketRight, { x: 0, y: -curVy });
      Body.setAngle(bucketLeft, 0);
      Body.setAngle(bucketRight, 0);
      Body.setAngularVelocity(bucketLeft, 0);
      Body.setAngularVelocity(bucketRight, 0);

      // 5. Floor support clamping to prevent payload penetration/tunneling through bucket floor
      const leftFloorY = leftBottomPart ? leftBottomPart.bounds.min.y : (bucketLeft.position.y + 15);
      for (const pb of payloadsLeft) {
        if (Math.abs(pb.position.x - bucketLeft.position.x) < bW / 2 + 2) {
          const pbBottom = pb.bounds.max.y;
          if (pbBottom > leftFloorY) {
            const pen = pbBottom - leftFloorY;
            Body.setPosition(pb, { x: pb.position.x, y: pb.position.y - pen });
            if (pb.velocity.y > curVy) {
              Body.setVelocity(pb, { x: pb.velocity.x * 0.95, y: curVy });
            }
            Body.setAngularVelocity(pb, pb.angularVelocity * 0.7);
          }
        }
      }

      const rightFloorY = rightBottomPart ? rightBottomPart.bounds.min.y : (bucketRight.position.y + 15);
      for (const pb of payloadsRight) {
        if (Math.abs(pb.position.x - bucketRight.position.x) < bW / 2 + 2) {
          const pbBottom = pb.bounds.max.y;
          if (pbBottom > rightFloorY) {
            const pen = pbBottom - rightFloorY;
            Body.setPosition(pb, { x: pb.position.x, y: pb.position.y - pen });
            if (pb.velocity.y > -curVy) {
              Body.setVelocity(pb, { x: pb.velocity.x * 0.95, y: -curVy });
            }
            Body.setAngularVelocity(pb, pb.angularVelocity * 0.7);
          }
        }
      }

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

    // 8.5. Paper Cup Water Collection, Weight & Overflow (紙コップの貯水・重量増加・あふれ)
    const paperCups = Array.from(this.bundles.values()).filter(b => b.type === 'paper_cup');
    for (const cupBundle of paperCups) {
      const cup = cupBundle.mainBody;
      if (!cup.plugin) cup.plugin = {};
      if (cup.plugin.waterLevel === undefined) cup.plugin.waterLevel = 0;
      if (!cup.plugin.baseMass) cup.plugin.baseMass = cup.mass;

      const w = cup.plugin.gadget?.options?.width || 56;
      const h = cup.plugin.gadget?.options?.height || 64;

      // Calculate tilt angle and maximum capacity before spilling over the lower rim
      // When cup is upright (tilt=0): maxCapacity = 1.0.
      // When tilted, the lower rim limits how much water can be retained.
      const tilt = Math.abs(Math.atan2(Math.sin(cup.angle), Math.cos(cup.angle)));
      let maxCapacity = 1.0;
      if (tilt >= Math.PI / 2) {
        maxCapacity = 0;
      } else if (tilt > 0.05) {
        const tanTheta = Math.tan(tilt);
        const maxFillH = Math.max(0, h - (w / 2) * tanTheta);
        maxCapacity = Math.max(0, Math.min(1, (maxFillH / h) * Math.cos(tilt)));
      }
      cup.plugin.maxCapacity = maxCapacity;

      // Identify the lower rim for overflow spilling
      const leftRimX = cup.position.x + (-w / 2 + 5) * Math.cos(cup.angle) - (-h / 2) * Math.sin(cup.angle);
      const leftRimY = cup.position.y + (-w / 2 + 5) * Math.sin(cup.angle) + (-h / 2) * Math.cos(cup.angle);
      const rightRimX = cup.position.x + (w / 2 - 5) * Math.cos(cup.angle) - (-h / 2) * Math.sin(cup.angle);
      const rightRimY = cup.position.y + (w / 2 - 5) * Math.sin(cup.angle) + (-h / 2) * Math.cos(cup.angle);

      // Which rim is lower (greater Y in canvas coords)?
      const lowerRim = leftRimY >= rightRimY
        ? { x: leftRimX, y: leftRimY, outward: -1 }
        : { x: rightRimX, y: rightRimY, outward: 1 };

      // 1. Inflow: absorb incoming water droplets entering the cup's mouth
      const cos = Math.cos(-cup.angle);
      const sin = Math.sin(-cup.angle);
      const innerW = w - 16;
      let newDropsAdded = 0;

      for (const d of this.waterDrops) {
        if ((d as any).isAbsorbed || d.body.plugin?.fromCup) continue;
        const dx = d.body.position.x - cup.position.x;
        const dy = d.body.position.y - cup.position.y;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Check if droplet is inside the cup interior
        if (localX >= -innerW / 2 && localX <= innerW / 2 && localY >= -h / 2 - 6 && localY <= h / 2 - 4) {
          (d as any).isAbsorbed = true;
          Composite.remove(this.engine.world, d.body);

          // If cup has capacity, add to water level
          if (cup.plugin.waterLevel < maxCapacity) {
            cup.plugin.waterLevel = Math.min(maxCapacity, cup.plugin.waterLevel + 0.035);
            newDropsAdded++;
          } else {
            // Already at full capacity -> queue overflow drop!
            cup.plugin.overflowBuffer = (cup.plugin.overflowBuffer || 0) + 1;
          }
        }
      }

      if (newDropsAdded > 0) {
        const now = Date.now();
        if (!cup.plugin.lastDripSound || now - cup.plugin.lastDripSound > 160) {
          cup.plugin.lastDripSound = now;
          soundEngine.playWaterDrip(0.25);
        }
      }

      // 2. Outflow / Overflow (あふれ出る水):
      let isOverflowing = false;
      cup.plugin.overflowCooldown = (cup.plugin.overflowCooldown || 0) + 1;

      // Handle excess water from tilting (cup knocked over or tilted)
      if (cup.plugin.waterLevel > maxCapacity) {
        isOverflowing = true;
        const excess = cup.plugin.waterLevel - maxCapacity;
        const spillAmount = Math.min(excess, 0.04);
        cup.plugin.waterLevel -= spillAmount;

        if (cup.plugin.overflowCooldown >= 2) {
          cup.plugin.overflowCooldown = 0;
          this.spawnOverflowDrop(cup, lowerRim);
        }
      }

      // Handle overflow from continuous faucet filling when full
      if ((cup.plugin.overflowBuffer || 0) > 0) {
        isOverflowing = true;
        while (cup.plugin.overflowBuffer > 0) {
          cup.plugin.overflowBuffer--;
          if (cup.plugin.overflowCooldown >= 2) {
            cup.plugin.overflowCooldown = 0;
            this.spawnOverflowDrop(cup, lowerRim);
          }
        }
      }

      cup.plugin.isOverflowing = isOverflowing;

      // 3. Dynamic Mass: cup gets realistically heavier with stored water
      const waterMass = cup.plugin.waterLevel * 3.5;
      Body.setMass(cup, cup.plugin.baseMass + waterMass);
    }

    // Clean up absorbed drops from array
    this.waterDrops = this.waterDrops.filter(d => !(d as any).isAbsorbed);

    // Clean up expired or fallen water drops
    const nowTime = Date.now();
    const activeDrops: { body: Matter.Body; birthTime: number }[] = [];
    for (const d of this.waterDrops) {
      const age = nowTime - d.birthTime;
      const isDead = age > 3000 || d.body.position.y > this.floorY + 30 || d.body.position.y < -200 || d.body.position.x < this.leftWallX - 80 || d.body.position.x > this.rightWallX + 80;
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

  // Spawn an overflowing water drop from paper cup rim
  private spawnOverflowDrop(cup: Matter.Body, rim: { x: number; y: number; outward: number }) {
    const r = 4.0 + (Math.random() - 0.5) * 1.0;
    const drop = Matter.Bodies.circle(rim.x + rim.outward * (2 + Math.random() * 3), rim.y + 2, r, {
      restitution: 0.12,
      friction: 0.01,
      frictionAir: 0.001,
      density: 0.0035,
      collisionFilter: {
        category: 0x0004,
        mask: 0xFFFFFFFF ^ 0x0002
      },
      label: 'water_drop'
    });
    drop.plugin = { birthTime: Date.now(), fromCup: true };

    Matter.Body.setVelocity(drop, {
      x: cup.velocity.x + rim.outward * (0.8 + Math.random() * 0.8),
      y: cup.velocity.y + 0.8 + Math.random() * 0.6
    });

    Composite.add(this.engine.world, drop);
    this.waterDrops.push({ body: drop, birthTime: Date.now() });

    const now = Date.now();
    if (!cup.plugin.lastSpillSound || now - cup.plugin.lastSpillSound > 180) {
      cup.plugin.lastSpillSound = now;
      soundEngine.playWaterDrip(0.22);
    }
  }

  // Spawn an overflowing water drop from pulley bucket rim
  private spawnPulleyOverflowDrop(bucket: Matter.Body, rim: { x: number; y: number; outward: number }) {
    const r = 3.6 + (Math.random() - 0.5) * 1.0;
    const drop = Matter.Bodies.circle(rim.x + rim.outward * (2 + Math.random() * 2), rim.y + 2, r, {
      restitution: 0.12,
      friction: 0.01,
      frictionAir: 0.001,
      density: 0.0035,
      collisionFilter: {
        category: 0x0004,
        mask: 0xFFFFFFFF ^ 0x0002
      },
      label: 'water_drop'
    });
    drop.plugin = { birthTime: Date.now(), fromBucket: true };

    Matter.Body.setVelocity(drop, {
      x: bucket.velocity.x + rim.outward * (0.8 + Math.random() * 0.8),
      y: bucket.velocity.y + 0.8 + Math.random() * 0.6
    });

    Composite.add(this.engine.world, drop);
    this.waterDrops.push({ body: drop, birthTime: Date.now() });

    const now = Date.now();
    if (!bucket.plugin.lastSpillSound || now - bucket.plugin.lastSpillSound > 180) {
      bucket.plugin.lastSpillSound = now;
      soundEngine.playWaterDrip(0.22);
    }
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
