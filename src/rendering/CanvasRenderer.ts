import { GadgetData, ViewportTransform } from '../types';
import { PhysicsEngine } from '../physics/PhysicsEngine';

export class CanvasRenderer {
  private animTime: number = 0;

  public render(
    ctx: CanvasRenderingContext2D,
    physics: PhysicsEngine,
    transform: ViewportTransform,
    selectedGadgetId: string | null,
    hoveredGadgetId: string | null,
    showGrid: boolean = true
  ) {
    this.animTime += 0.02;
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#1e293b'; // Slate 800
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Apply viewport transform (pan & zoom)
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw Grid
    if (showGrid) {
      this.drawGrid(ctx, width, height, transform);
    }

    // Draw Floor (画面下部の床)
    this.drawFloor(ctx, physics.floorY, width, height, transform);

    // Render all physical gadget bundles
    const bundles = Array.from(physics.bundles.values());

    // 1. Render background fields (Water, Wind, Magnetic fields) first
    for (const bundle of bundles) {
      if (bundle.type === 'water') {
        this.drawWater(ctx, bundle.mainBody);
      } else if (bundle.type === 'fan') {
        this.drawFanWind(ctx, bundle.mainBody, physics.isRunning);
      } else if (bundle.type === 'magnet') {
        this.drawMagnetField(ctx, bundle.mainBody);
      }
    }

    // 2. Render physical objects
    for (const bundle of bundles) {
      const isSelected = bundle.gadgetId === selectedGadgetId;
      const isHovered = bundle.gadgetId === hoveredGadgetId;

      switch (bundle.type) {
        case 'plank':
          this.drawPlank(ctx, bundle.mainBody);
          break;
        case 'book':
          this.drawBook(ctx, bundle.mainBody);
          break;
        case 'domino':
          this.drawDomino(ctx, bundle.mainBody);
          break;
        case 'spring':
          this.drawSpring(ctx, bundle.mainBody);
          break;
        case 'seesaw':
          this.drawSeesaw(ctx, bundle);
          break;
        case 'paper_cup':
          this.drawPaperCup(ctx, bundle.mainBody);
          break;
        case 'toilet_paper_tube':
          this.drawToiletPaperTube(ctx, bundle.mainBody);
          break;
        case 'rubber_band':
          this.drawRubberBand(ctx, bundle.mainBody);
          break;
        case 'pendulum':
          this.drawPendulum(ctx, bundle);
          break;
        case 'fan':
          this.drawFan(ctx, bundle.mainBody, physics.isRunning);
          break;
        case 'magnet':
          this.drawMagnet(ctx, bundle.mainBody);
          break;
        case 'marble':
          this.drawMarble(ctx, bundle.mainBody);
          break;
        case 'start_gate':
          this.drawStartGate(ctx, bundle.mainBody);
          break;
        case 'goal':
          this.drawGoal(ctx, bundle.mainBody);
          break;
        default:
          this.drawGenericBody(ctx, bundle.mainBody);
      }

      // Draw hover/selection highlights
      if (isSelected || isHovered) {
        this.drawHighlight(ctx, bundle.mainBody, isSelected);
      }
    }

    // 3. Draw rotation handle gizmo for selected object (in edit mode)
    if (selectedGadgetId && !physics.isRunning) {
      const bundle = physics.bundles.get(selectedGadgetId);
      if (bundle) {
        this.drawRotationHandle(ctx, bundle.mainBody);
      }
    }

    ctx.restore();
  }

  // Draw millimeter / engineering grid
  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, transform: ViewportTransform) {
    const gridSize = 40;
    const startX = Math.floor(-transform.x / transform.scale / gridSize) * gridSize - gridSize;
    const startY = Math.floor(-transform.y / transform.scale / gridSize) * gridSize - gridSize;
    const endX = startX + (w / transform.scale) + gridSize * 2;
    const endY = startY + (h / transform.scale) + gridSize * 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Major grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize * 5) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize * 5) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  // Environmental Floor (画面下部の床 - 木製フローリング/作業台)
  private drawFloor(
    ctx: CanvasRenderingContext2D,
    floorY: number,
    width: number,
    height: number,
    transform: ViewportTransform
  ) {
    const visibleLeft = -transform.x / transform.scale - 200;
    const visibleRight = (-transform.x + width) / transform.scale + 200;
    const visibleBottom = Math.max(floorY + 800, (-transform.y + height) / transform.scale + 200);
    const floorTotalHeight = visibleBottom - floorY;

    ctx.save();

    // 1. Base Flooring Gradient (Warm Oak Wood)
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 80);
    floorGrad.addColorStop(0, '#78350f');    // Rich oak amber
    floorGrad.addColorStop(0.15, '#92400e'); // Warm wood body
    floorGrad.addColorStop(0.6, '#78350f');  // Wood depth
    floorGrad.addColorStop(1, '#451a03');    // Deep foundation wood

    ctx.fillStyle = floorGrad;
    ctx.fillRect(visibleLeft, floorY, visibleRight - visibleLeft, floorTotalHeight);

    // Deep subfloor fill (below 80px)
    if (floorTotalHeight > 80) {
      ctx.fillStyle = '#1c1917'; // Dark solid stone/underfloor
      ctx.fillRect(visibleLeft, floorY + 80, visibleRight - visibleLeft, floorTotalHeight - 80);
    }

    // 2. Skirting Board / Top Trim Bar (巾木・トップエッジ)
    const trimHeight = 6;
    ctx.fillStyle = '#b45309';
    ctx.fillRect(visibleLeft, floorY, visibleRight - visibleLeft, trimHeight);

    // Bevel highlight line on the very top edge of the floor
    ctx.strokeStyle = '#fde68a'; // Amber 200 crisp highlight
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(visibleLeft, floorY + 0.75);
    ctx.lineTo(visibleRight, floorY + 0.75);
    ctx.stroke();

    // Trim bottom shadow line
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(visibleLeft, floorY + trimHeight);
    ctx.lineTo(visibleRight, floorY + trimHeight);
    ctx.stroke();

    // 3. Wooden Parquet / Flooring Plank Seams (フローリングの目地)
    const plankWidth = 140;
    const startX = Math.floor(visibleLeft / plankWidth) * plankWidth;

    ctx.strokeStyle = 'rgba(67, 20, 7, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = startX; x <= visibleRight; x += plankWidth) {
      ctx.moveTo(x, floorY + trimHeight);
      ctx.lineTo(x, floorY + 80);
    }
    ctx.stroke();

    // Subtle alternating plank tone highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let x = startX; x <= visibleRight; x += plankWidth * 2) {
      ctx.fillRect(x, floorY + trimHeight, plankWidth, 80 - trimHeight);
    }

    // 4. Subtle horizontal wood grain lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(visibleLeft, floorY + 24);
    ctx.lineTo(visibleRight, floorY + 24);
    ctx.moveTo(visibleLeft, floorY + 52);
    ctx.lineTo(visibleRight, floorY + 52);
    ctx.stroke();

    // 5. Contact line / shadow just below top surface
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(visibleLeft, floorY + 80);
    ctx.lineTo(visibleRight, floorY + 80);
    ctx.stroke();

    ctx.restore();
  }

  // Shiny Red Marble (赤いビー玉)
  private drawMarble(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const r = (body.circleRadius as number) || 14;
    const isPlayer = body.label === 'player_marble';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Drop shadow
    ctx.beginPath();
    ctx.arc(1.5, 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // 3D Spherical gradient
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    if (isPlayer) {
      grad.addColorStop(0, '#fca5a5'); // light red highlight
      grad.addColorStop(0.3, '#ef4444'); // vibrant red
      grad.addColorStop(0.8, '#b91c1c'); // deep red
      grad.addColorStop(1, '#7f1d1d'); // shadow red
    } else {
      grad.addColorStop(0, '#93c5fd');
      grad.addColorStop(0.3, '#3b82f6');
      grad.addColorStop(0.8, '#1d4ed8');
      grad.addColorStop(1, '#1e3a8a');
    }

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner swirl pattern to visually show marble rolling
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0.4, 2.2);
    ctx.stroke();

    // Specular glossy reflection point
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();

    ctx.restore();
  }

  // Wooden Plank (木の板)
  private drawPlank(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const w = body.bounds.max.x - body.bounds.min.x; // approx
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const width = gadget?.options?.width || 180;
    const height = gadget?.options?.height || 16;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(-width / 2 + 2, -height / 2 + 3, width, height);

    // Wood fill
    const woodGrad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    woodGrad.addColorStop(0, '#d97706'); // warm amber wood
    woodGrad.addColorStop(0.5, '#b45309');
    woodGrad.addColorStop(1, '#78350f');

    ctx.fillStyle = woodGrad;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, 4);
    ctx.fill();

    // Wood grain lines
    ctx.strokeStyle = 'rgba(67, 20, 7, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 6, -2);
    ctx.lineTo(width / 2 - 6, -2);
    ctx.moveTo(-width / 2 + 20, 2);
    ctx.lineTo(width / 2 - 15, 2);
    ctx.stroke();

    // Bevel border
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // Book (本)
  private drawBook(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 32;
    const h = gadget?.options?.height || 90;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Book cover
    ctx.fillStyle = '#1e3a8a'; // Deep Navy Book
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    ctx.fill();

    // White paper pages block inside
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, h - 6);

    // Book spine strip
    ctx.fillStyle = '#dc2626'; // Red spine
    ctx.fillRect(-w / 2, -h / 2, 6, h);

    // Gold title embossing
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOOK', 2, 3);

    ctx.restore();
  }

  // Domino (ドミノ)
  private drawDomino(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 12;
    const h = gadget?.options?.height || 54;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Domino Ivory Body
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2);
    ctx.fill();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Middle separator line
    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, 0);
    ctx.lineTo(w / 2 - 2, 0);
    ctx.stroke();

    // Domino dots (pips)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -h / 4, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, h / 4, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Spring / Bouncer (バネ)
  private drawSpring(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 60;
    const h = gadget?.options?.height || 26;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Spring Base Mount
    ctx.fillStyle = '#475569';
    ctx.fillRect(-w / 2, h / 2 - 5, w, 5);

    // Spring Coil Zig-Zag
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const coilSteps = 5;
    for (let i = 0; i <= coilSteps; i++) {
      const px = -w / 3 + (w * 0.66 * i) / coilSteps;
      const py = (i % 2 === 0) ? -2 : 7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Top Bouncer Pad (Orange High-Elastic Plate)
    const padGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    padGrad.addColorStop(0, '#ea580c');
    padGrad.addColorStop(0.5, '#fb923c');
    padGrad.addColorStop(1, '#ea580c');

    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, 8, 4);
    ctx.fill();
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // Seesaw (シーソー)
  private drawSeesaw(ctx: CanvasRenderingContext2D, bundle: { bodies: Matter.Body[]; constraints: Matter.Constraint[] }) {
    const plank = bundle.bodies.find(b => b.label === 'seesaw_plank') || bundle.bodies[0];
    const pivot = bundle.bodies.find(b => b.label === 'seesaw_pivot');

    // 1. Draw triangular fulcrum base
    if (pivot) {
      ctx.save();
      ctx.translate(pivot.position.x, pivot.position.y);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(16, 14);
      ctx.lineTo(-16, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pivot center screw pin
      ctx.beginPath();
      ctx.arc(0, -12, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw rotating plank
    if (plank) {
      this.drawPlank(ctx, plank);
    }
  }

  // Paper Cup (紙コップ)
  private drawPaperCup(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 56;
    const h = gadget?.options?.height || 64;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Cup outline and fill (white/cream paper texture)
    ctx.fillStyle = '#fdfbf7';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 5, -h / 2); // top left rim
    ctx.lineTo(w / 2 - 5, -h / 2);  // top right rim
    ctx.lineTo(w / 2 - 12, h / 2);  // bottom right
    ctx.lineTo(-w / 2 + 12, h / 2); // bottom left
    ctx.closePath();
    ctx.fill();

    // Red striped decorative band
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-w / 2 + 7, -h / 4, w - 14, 8);

    // Rim border
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  // Toilet Paper Tube (トイレットペーパーの芯)
  private drawToiletPaperTube(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const length = gadget?.options?.width || 160;
    const diameter = gadget?.options?.height || 46;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Cardboard brown cylinder
    const cardGrad = ctx.createLinearGradient(0, -diameter / 2, 0, diameter / 2);
    cardGrad.addColorStop(0, '#b45309');
    cardGrad.addColorStop(0.3, '#d97706');
    cardGrad.addColorStop(0.7, '#b45309');
    cardGrad.addColorStop(1, '#92400e');

    // Hollow dark interior behind
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-length / 2, -diameter / 2 + 6, length, diameter - 12);

    // Upper tube wall
    ctx.fillStyle = cardGrad;
    ctx.fillRect(-length / 2, -diameter / 2, length, 7);

    // Lower tube wall
    ctx.fillRect(-length / 2, diameter / 2 - 7, length, 7);

    // Spiral seam lines (classic paper roll)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-length / 4, -diameter / 2);
    ctx.lineTo(length / 4, diameter / 2);
    ctx.stroke();

    // Ends ellipse
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-length / 2, -diameter / 2, length, diameter);

    ctx.restore();
  }

  // Rubber Band (輪ゴム)
  private drawRubberBand(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 100;
    const h = 10;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Stretched tan/yellowish rubber cord
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 5);
    ctx.fill();

    // End mounting pegs
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(-w / 2, 0, 5, 0, Math.PI * 2);
    ctx.arc(w / 2, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Pendulum / Suspended weight (振り子)
  private drawPendulum(ctx: CanvasRenderingContext2D, bundle: { bodies: Matter.Body[]; constraints: Matter.Constraint[] }) {
    const anchor = bundle.bodies.find(b => b.label === 'pendulum_anchor') || bundle.bodies[0];
    const bob = bundle.bodies.find(b => b.label === 'pendulum_bob');

    if (anchor && bob) {
      ctx.save();
      // Draw string
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(anchor.position.x, anchor.position.y);
      ctx.lineTo(bob.position.x, bob.position.y);
      ctx.stroke();

      // Anchor pin
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(anchor.position.x, anchor.position.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Heavy metal bob
      ctx.translate(bob.position.x, bob.position.y);
      const bobR = (bob.circleRadius as number) || 18;
      const grad = ctx.createRadialGradient(-bobR * 0.3, -bobR * 0.3, 2, 0, 0, bobR);
      grad.addColorStop(0, '#94a3b8');
      grad.addColorStop(0.5, '#475569');
      grad.addColorStop(1, '#0f172a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, bobR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Fan (扇風機)
  private drawFan(ctx: CanvasRenderingContext2D, body: Matter.Body, isRunning: boolean) {
    const { x, y } = body.position;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Fan rear housing and stand (mounted behind/below)
    ctx.fillStyle = '#334155';
    ctx.fillRect(-14, -6, 10, 12);
    ctx.fillRect(-8, 12, 10, 14);

    // Outer cage ring
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Motor Hub
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Blades
    const bladeAngle = isRunning ? this.animTime * 18 : 0;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const a = bladeAngle + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.stroke();
    }

    // Front air discharge cone marker (+x direction)
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(4, 0, 16, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.stroke();

    // Directional arrow on the fan face pointing in wind direction
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(8, -4);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Fan Wind Stream Animation (気流エフェクト)
  private drawFanWind(ctx: CanvasRenderingContext2D, fanBody: Matter.Body, isRunning: boolean) {
    const { x, y } = fanBody.position;
    const angle = fanBody.angle;
    const range = 260;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (isRunning) {
      // Animated blowing wind streamlines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;

      for (let i = -2; i <= 2; i++) {
        const yOffset = i * 18;
        const progress = (this.animTime * 140 + i * 40) % range;
        ctx.beginPath();
        ctx.moveTo(progress + 15, yOffset);
        ctx.lineTo(progress + 55, yOffset);
        ctx.stroke();
      }
    } else {
      // In Edit Mode: Draw a clear preview wind cone and direction arrow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(20, -14);
      ctx.lineTo(130, -42);
      ctx.moveTo(20, 14);
      ctx.lineTo(130, 42);
      ctx.stroke();

      // Center arrow
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(80, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(70, -5);
      ctx.lineTo(70, 5);
      ctx.closePath();
      ctx.fill();

      // Text label
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      ctx.font = '9px sans-serif';
      ctx.fillText('風向 ➜', 35, -7);
    }

    ctx.restore();
  }

  // Magnet (磁石)
  private drawMagnet(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const w = 48;
    const h = 32;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // North Pole (Red)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w / 2, h, [4, 0, 0, 4]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', -w / 4, 4);

    // South Pole (Blue)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(0, -h / 2, w / 2, h, [0, 4, 4, 0]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('S', w / 4, 4);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // Magnet Field Lines (磁力線アニメーション)
  private drawMagnetField(ctx: CanvasRenderingContext2D, magnetBody: Matter.Body) {
    const { x, y } = magnetBody.position;
    const magRadius = 160;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(magnetBody.angle);

    ctx.strokeStyle = 'rgba(147, 197, 253, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -this.animTime * 20;

    // Magnetic field arcs connecting N and S poles
    for (let r = 40; r <= magRadius; r += 35) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Water Pool (水槽・水たまり)
  private drawWater(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 160;
    const h = gadget?.options?.height || 90;
    const { x, y } = body.position;

    ctx.save();
    ctx.translate(x, y);

    // Semi-transparent blue water body
    const waterGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    waterGrad.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
    waterGrad.addColorStop(1, 'rgba(3, 105, 161, 0.65)');

    ctx.fillStyle = waterGrad;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // Wavy water surface line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    for (let px = -w / 2; px <= w / 2; px += 8) {
      const wave = Math.sin(this.animTime * 4 + px * 0.08) * 3;
      ctx.lineTo(px, -h / 2 + wave);
    }
    ctx.stroke();

    // Rising bubbles inside water
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 4; i++) {
      const bx = -w / 3 + i * (w / 4);
      const by = (h / 2 - 10) - ((this.animTime * 30 + i * 25) % (h - 20));
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Start Gate (スタート台)
  private drawStartGate(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;

    ctx.save();
    ctx.translate(x, y);

    // Start Holder Platform
    ctx.fillStyle = '#059669'; // Emerald green
    ctx.beginPath();
    ctx.roundRect(-22, -4, 44, 14, 4);
    ctx.fill();

    // Start Pole and Flag
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.lineTo(-18, -26);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(-18, -26);
    ctx.lineTo(-4, -20);
    ctx.lineTo(-18, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('START', 0, 7);

    ctx.restore();
  }

  // Goal (ピタゴラ風ゴール装置)
  private drawGoal(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;

    ctx.save();
    ctx.translate(x, y);

    // Goal Box / Cup
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(-24, 0, 48, 22, 4);
    ctx.fill();

    // Gold Trim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pitagora Switch-style Goal Flag Arch
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-20, -32);
    ctx.lineTo(20, -32);
    ctx.lineTo(20, 0);
    ctx.stroke();

    // Banner "GOAL"
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-18, -30, 36, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', 0, -18);

    ctx.restore();
  }

  // Generic fallback
  private drawGenericBody(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = body.render.fillStyle || '#64748b';
    ctx.beginPath();
    const vertices = body.vertices;
    if (vertices && vertices.length > 0) {
      ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Highlight border on selected or hovered gadget
  private drawHighlight(ctx: CanvasRenderingContext2D, body: Matter.Body, isSelected: boolean) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.setLineDash(isSelected ? [5, 4] : [3, 3]);

    const bounds = body.bounds;
    const w = (bounds.max.x - bounds.min.x) + 12;
    const h = (bounds.max.y - bounds.min.y) + 12;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.restore();
  }

  // Rotation Handle Gizmo (ドラッグして直感的に回転できるハンドル)
  private drawRotationHandle(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const handleDist = 48;
    const handleX = x + Math.cos(body.angle) * handleDist;
    const handleY = y + Math.sin(body.angle) * handleDist;

    ctx.save();
    // Connecting dashed line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(handleX, handleY);
    ctx.stroke();

    // Circle knob
    ctx.setLineDash([]);
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Degree readout
    const deg = Math.round(((body.angle * 180) / Math.PI) % 360);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px monospace';
    ctx.fillText(`${deg}°`, handleX + 12, handleY + 4);

    ctx.restore();
  }
}
