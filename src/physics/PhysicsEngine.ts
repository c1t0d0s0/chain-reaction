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
          (labelA === 'player_marble' && labelB === 'goal') ||
          (labelB === 'player_marble' && labelA === 'goal')
        )) {
          this.goalReached = true;
          soundEngine.playGoalJingle();
          if (this.onGoalReached) {
            this.onGoalReached();
          }
          continue;
        }

        // Water splash check
        if (labelA === 'water' || labelB === 'water') {
          soundEngine.playWaterSplash(speed);
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

        // Wood / Plank / Book / Floor impacts
        if (
          labelA.includes('marble') || labelB.includes('marble') ||
          labelA === 'domino' || labelB === 'domino' ||
          labelA === 'book' || labelB === 'book' ||
          labelA === 'plank' || labelB === 'plank' ||
          labelA === 'floor' || labelB === 'floor'
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

      this.accumulator -= fixedDelta;
    }

    // 3. Update rolling sound for player marble
    this.updateAudioFeedback();
  }

  private applySpecialForces() {
    const allBodies = Composite.allBodies(this.engine.world);
    const fans: Matter.Body[] = [];
    const magnets: Matter.Body[] = [];
    const waters: Matter.Body[] = [];

    for (const b of allBodies) {
      if (b.label === 'fan') fans.push(b);
      if (b.label === 'magnet') magnets.push(b);
      if (b.label === 'water') waters.push(b);
    }

    // Dynamic bodies that react to forces
    const dynamicBodies = allBodies.filter((b: Matter.Body) => !b.isStatic && !b.isSensor);

    // 1. Fan Wind Field (blows wind in the direction of fan.angle)
    for (const fan of fans) {
      const fanAngle = fan.angle;
      // Direction vector of fan blow
      const dir = { x: Math.cos(fanAngle), y: Math.sin(fanAngle) };
      const range = 260; // Wind stream reach
      const coneWidth = 75; // Wind stream half-width

      for (const body of dynamicBodies) {
        const dx = body.position.x - fan.position.x;
        const dy = body.position.y - fan.position.y;
        // Project onto wind direction
        const proj = dx * dir.x + dy * dir.y;
        if (proj > 0 && proj < range) {
          // Perpendicular distance
          const perpDist = Math.abs(-dx * dir.y + dy * dir.x);
          if (perpDist < coneWidth) {
            // Wind force weakens with distance
            const falloff = 1 - (proj / range);
            const windForce = 0.0018 * falloff;
            Body.applyForce(body, body.position, {
              x: dir.x * windForce,
              y: dir.y * windForce
            });
          }
        }
      }
    }

    // 2. Magnet Force Field (attracts metallic/marble objects within radius)
    for (const magnet of magnets) {
      const magRadius = 180;
      const polarity = magnet.plugin?.gadget?.options?.polarity ?? 'attract';
      const strength = (magnet.plugin?.gadget?.options?.power ?? 1.0) * 0.0035;

      for (const body of dynamicBodies) {
        if (body.label.includes('marble') || body.label === 'domino') {
          const dx = magnet.position.x - body.position.x;
          const dy = magnet.position.y - body.position.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 10 && dist < magRadius) {
            const factor = (1 - dist / magRadius) * strength;
            const sign = polarity === 'attract' ? 1 : -1;
            Body.applyForce(body, body.position, {
              x: (dx / dist) * factor * sign,
              y: (dy / dist) * factor * sign
            });
          }
        }
      }
    }

    // 3. Water Buoyancy & Viscous Damping
    for (const water of waters) {
      const wBounds = water.bounds;
      for (const body of dynamicBodies) {
        const bPos = body.position;
        if (
          bPos.x >= wBounds.min.x && bPos.x <= wBounds.max.x &&
          bPos.y >= wBounds.min.y && bPos.y <= wBounds.max.y
        ) {
          // Upward buoyant force counteracting gravity + light float
          const buoyancy = -0.0013 * body.mass;
          Body.applyForce(body, body.position, { x: 0, y: buoyancy });

          // Fluid viscosity drag (damping)
          Body.setVelocity(body, {
            x: body.velocity.x * 0.94,
            y: body.velocity.y * 0.94
          });
          Body.setAngularVelocity(body, body.angularVelocity * 0.92);
        }
      }
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
