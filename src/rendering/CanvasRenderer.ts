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

    // Draw Room Boundaries (左右の壁と床)
    this.drawRoomBoundaries(ctx, physics.leftWallX, physics.rightWallX, physics.floorY, width, height, transform);

    // Render all physical gadget bundles
    const bundles = Array.from(physics.bundles.values());

    // 1. Render background fields (Wind, Magnetic fields) first
    for (const bundle of bundles) {
      if (bundle.type === 'fan') {
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
        case 'brick':
        case 'book':
          this.drawBrick(ctx, bundle.mainBody);
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
        case 'funnel':
          this.drawFunnel(ctx, bundle.mainBody);
          break;
        case 'bell':
          this.drawBell(ctx, bundle.mainBody);
          break;
        case 'paddle_wheel':
          this.drawPaddleWheel(ctx, bundle);
          break;
        case 'pulley':
          this.drawPulley(ctx, bundle);
          break;
        case 'catapult':
          this.drawCatapult(ctx, bundle);
          break;
        case 'faucet':
          this.drawFaucet(ctx, bundle.mainBody, physics.isRunning);
          break;
        default:
          this.drawGenericBody(ctx, bundle.mainBody);
      }

      // Draw hover/selection highlights
      if (isSelected || isHovered) {
        this.drawHighlight(ctx, bundle.mainBody, isSelected);
      }
    }

    // 2.5 Draw active water droplets
    for (const d of physics.waterDrops) {
      this.drawWaterDrop(ctx, d.body);
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

  // Environmental Room Boundaries (画面の床・左右の木製壁柱)
  private drawRoomBoundaries(
    ctx: CanvasRenderingContext2D,
    leftWallX: number,
    rightWallX: number,
    floorY: number,
    width: number,
    height: number,
    transform: ViewportTransform
  ) {
    const visibleLeft = -transform.x / transform.scale - 200;
    const visibleRight = (-transform.x + width) / transform.scale + 200;
    const visibleTop = -transform.y / transform.scale - 200;
    const visibleBottom = Math.max(floorY + 800, (-transform.y + height) / transform.scale + 200);
    const floorTotalHeight = visibleBottom - floorY;

    ctx.save();

    // ==========================================
    // 1. FLOOR (フローリング床)
    // ==========================================
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

    // Skirting Board / Top Trim Bar (床の巾木・トップエッジ)
    const trimHeight = 6;
    ctx.fillStyle = '#b45309';
    ctx.fillRect(visibleLeft, floorY, visibleRight - visibleLeft, trimHeight);

    // Bevel highlight line on the top surface of the floor
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

    // Wooden Parquet Plank Seams (フローリング目地)
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

    // Alternating plank tone highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let x = startX; x <= visibleRight; x += plankWidth * 2) {
      ctx.fillRect(x, floorY + trimHeight, plankWidth, 80 - trimHeight);
    }

    // Subtle horizontal wood grain lines on floor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(visibleLeft, floorY + 24);
    ctx.lineTo(visibleRight, floorY + 24);
    ctx.moveTo(visibleLeft, floorY + 52);
    ctx.lineTo(visibleRight, floorY + 52);
    ctx.stroke();

    // ==========================================
    // 2. LEFT WALL (左側の木製柱・壁)
    // ==========================================
    const wallPillarWidth = 24;

    // Dark exterior backdrop to the left of the left wall
    if (visibleLeft < leftWallX - wallPillarWidth) {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(visibleLeft, visibleTop, (leftWallX - wallPillarWidth) - visibleLeft, (floorY - visibleTop) + 80);
    }

    // Left Wall Pillar
    const leftPillarGrad = ctx.createLinearGradient(leftWallX - wallPillarWidth, 0, leftWallX, 0);
    leftPillarGrad.addColorStop(0, '#5c2807');    // Shadow corner
    leftPillarGrad.addColorStop(0.5, '#78350f');  // Cedar wood
    leftPillarGrad.addColorStop(0.85, '#92400e'); // Front face
    leftPillarGrad.addColorStop(1, '#b45309');    // Front trim edge

    ctx.fillStyle = leftPillarGrad;
    ctx.fillRect(leftWallX - wallPillarWidth, visibleTop, wallPillarWidth, (floorY - visibleTop) + 6);

    // Left wall vertical wood grain grooves
    ctx.strokeStyle = 'rgba(67, 20, 7, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftWallX - 16, visibleTop);
    ctx.lineTo(leftWallX - 16, floorY);
    ctx.moveTo(leftWallX - 8, visibleTop);
    ctx.lineTo(leftWallX - 8, floorY);
    ctx.stroke();

    // Left wall inner edge bevel highlight (inner boundary face)
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftWallX - 0.75, visibleTop);
    ctx.lineTo(leftWallX - 0.75, floorY + 6);
    ctx.stroke();

    // Left wall drop shadow cast into the room
    const leftShadowGrad = ctx.createLinearGradient(leftWallX, 0, leftWallX + 16, 0);
    leftShadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
    leftShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leftShadowGrad;
    ctx.fillRect(leftWallX, visibleTop, 16, floorY - visibleTop);

    // Left wall baseboard block / plinth at floor joint
    ctx.fillStyle = '#92400e';
    ctx.fillRect(leftWallX - wallPillarWidth - 4, floorY - 14, wallPillarWidth + 8, 20);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftWallX - wallPillarWidth - 4, floorY - 14, wallPillarWidth + 8, 20);

    // ==========================================
    // 3. RIGHT WALL (右側の木製柱・壁)
    // ==========================================
    // Dark exterior backdrop to the right of the right wall
    if (visibleRight > rightWallX + wallPillarWidth) {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(rightWallX + wallPillarWidth, visibleTop, visibleRight - (rightWallX + wallPillarWidth), (floorY - visibleTop) + 80);
    }

    // Right Wall Pillar
    const rightPillarGrad = ctx.createLinearGradient(rightWallX, 0, rightWallX + wallPillarWidth, 0);
    rightPillarGrad.addColorStop(0, '#b45309');    // Front trim edge
    rightPillarGrad.addColorStop(0.15, '#92400e'); // Front face
    rightPillarGrad.addColorStop(0.5, '#78350f');  // Cedar wood
    rightPillarGrad.addColorStop(1, '#5c2807');    // Shadow corner

    ctx.fillStyle = rightPillarGrad;
    ctx.fillRect(rightWallX, visibleTop, wallPillarWidth, (floorY - visibleTop) + 6);

    // Right wall vertical wood grain grooves
    ctx.strokeStyle = 'rgba(67, 20, 7, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightWallX + 8, visibleTop);
    ctx.lineTo(rightWallX + 8, floorY);
    ctx.moveTo(rightWallX + 16, visibleTop);
    ctx.lineTo(rightWallX + 16, floorY);
    ctx.stroke();

    // Right wall inner edge bevel highlight (inner boundary face)
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rightWallX + 0.75, visibleTop);
    ctx.lineTo(rightWallX + 0.75, floorY + 6);
    ctx.stroke();

    // Right wall drop shadow cast into the room
    const rightShadowGrad = ctx.createLinearGradient(rightWallX - 16, 0, rightWallX, 0);
    rightShadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rightShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = rightShadowGrad;
    ctx.fillRect(rightWallX - 16, visibleTop, 16, floorY - visibleTop);

    // Right wall baseboard block / plinth at floor joint
    ctx.fillStyle = '#92400e';
    ctx.fillRect(rightWallX - 4, floorY - 14, wallPillarWidth + 8, 20);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rightWallX - 4, floorY - 14, wallPillarWidth + 8, 20);

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

  // Brick (レンガ - baked red terracotta clay brick with core indentations)
  private drawBrick(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 72;
    const h = gadget?.options?.height || 36;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // 1. Soft contact shadow underneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 1, -h / 2 + 2, w, h, 2);
    ctx.fill();

    // 2. Brick Main Clay Body (Warm Terracotta / Baked Red Clay gradient)
    const brickGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    brickGrad.addColorStop(0, '#b91c1c');    // Rich terracotta red (red-700)
    brickGrad.addColorStop(0.3, '#dc2626');  // Warm baked face (red-600)
    brickGrad.addColorStop(0.7, '#991b1b');  // Deep clay (red-800)
    brickGrad.addColorStop(1, '#7f1d1d');    // Shadow foundation (red-900)

    ctx.fillStyle = brickGrad;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2.5);
    ctx.fill();

    // 3. Beveled highlights and shadows on edges (3D crisp masonry feel)
    // Top highlight (specular reflection on upper edge)
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 2 + 1);
    ctx.lineTo(w / 2 - 2, -h / 2 + 1);
    ctx.stroke();

    // Left edge soft highlight
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 1, -h / 2 + 2);
    ctx.lineTo(-w / 2 + 1, h / 2 - 2);
    ctx.stroke();

    // Bottom edge shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, h / 2 - 1);
    ctx.lineTo(w / 2 - 2, h / 2 - 1);
    ctx.stroke();

    // 4. Characteristic Brick Core Indentations / Holes (3つ穴レンガの意匠)
    const isHorizontal = w >= h;
    const holeRadius = Math.min(w, h) * 0.18;

    if (holeRadius >= 2.5) {
      const holePositions = isHorizontal
        ? [
            { x: -w * 0.28, y: 0 },
            { x: 0, y: 0 },
            { x: w * 0.28, y: 0 }
          ]
        : [
            { x: 0, y: -h * 0.28 },
            { x: 0, y: 0 },
            { x: 0, y: h * 0.28 }
          ];

      for (const pos of holePositions) {
        // Outer recess rim shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, holeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner dark hole depth
        ctx.fillStyle = '#450a0a'; // Deep burnt maroon
        ctx.beginPath();
        ctx.arc(pos.x, pos.y + 0.5, holeRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Lower rim highlight
        ctx.strokeStyle = 'rgba(254, 202, 202, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, holeRadius, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      }
    }

    // 5. Subtle terracotta clay fleck texture
    if (w >= 30 && h >= 20) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(-w * 0.35, -h * 0.25, 2, 1.5);
      ctx.fillRect(w * 0.2, h * 0.2, 2.5, 1.5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(-w * 0.15, h * 0.22, 2, 1.5);
      ctx.fillRect(w * 0.32, -h * 0.2, 1.5, 1.5);
    }

    // Outer brick border
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2.5);
    ctx.stroke();

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

  // Paper Cup (紙コップ - realistic water fill, meniscus, and overflow effects)
  private drawPaperCup(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 56;
    const h = gadget?.options?.height || 64;
    const rawWater = body.plugin?.waterLevel ?? gadget?.options?.waterAmount ?? 0;
    const waterLevel = Math.max(0, Math.min(1, rawWater));
    const isOverflowing = Boolean(body.plugin?.isOverflowing);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Geometry of paper cup:
    // Top rim: y = -h / 2, width = w - 10 (-w/2 + 5 to w/2 - 5)
    // Bottom: y = h / 2, width = w - 24 (-w/2 + 12 to w/2 - 12)
    const topW = w - 10;
    const botW = w - 24;
    const topY = -h / 2;
    const botY = h / 2;

    // 1. Soft contact shadow underneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0, botY + 2, botW / 2 + 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Inner back cavity of cup (visible from top or through translucency)
    const backGrad = ctx.createLinearGradient(0, topY, 0, botY);
    backGrad.addColorStop(0, '#e7e2d8');
    backGrad.addColorStop(0.3, '#ded8cc');
    backGrad.addColorStop(1, '#cdc6b8');

    ctx.fillStyle = backGrad;
    ctx.beginPath();
    ctx.moveTo(-topW / 2 + 1, topY + 2);
    ctx.lineTo(topW / 2 - 1, topY + 2);
    ctx.lineTo(botW / 2 - 2, botY - 3);
    ctx.lineTo(-botW / 2 + 2, botY - 3);
    ctx.closePath();
    ctx.fill();

    // 3. Water liquid inside cup
    if (waterLevel > 0.005) {
      // Liquid height: fills from bottom (botY - 4) upward towards (topY + 3)
      const maxWaterH = h - 9;
      const liquidH = maxWaterH * waterLevel;
      const surfaceY = (botY - 4) - liquidH;

      // Cup tapers linearly: calculate width at surfaceY
      const tSurface = Math.max(0, Math.min(1, (surfaceY - topY) / h));
      const surfaceW = topW * (1 - tSurface) + botW * tSurface - 4;
      const bottomWaterW = botW - 4;

      // Water body gradient (crystal-clear sky blue to deep water blue)
      const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, botY - 4);
      waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.88)');   // sky-400
      waterGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.92)'); // sky-500
      waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.96)');    // sky-600

      ctx.save();
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.moveTo(-surfaceW / 2, surfaceY);
      ctx.lineTo(surfaceW / 2, surfaceY);
      ctx.lineTo(bottomWaterW / 2, botY - 4);
      ctx.lineTo(-bottomWaterW / 2, botY - 4);
      ctx.closePath();
      ctx.fill();

      // Liquid surface meniscus (water surface line with slight curve & specular glint)
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, surfaceY, surfaceW / 2, Math.min(3, surfaceW * 0.08), 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fill();

      // Specular glint highlight on water surface
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-surfaceW * 0.22, surfaceY, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Rising tiny bubbles if water is present
      if (waterLevel > 0.3) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-surfaceW * 0.15, surfaceY + liquidH * 0.45, 1.2, 0, Math.PI * 2);
        ctx.arc(surfaceW * 0.2, surfaceY + liquidH * 0.7, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Outer Paper Shell
    // When cup contains water, the wet/filled portion has subtle translucency
    // allowing the blue water to gently show through the white paper
    const paperGrad = ctx.createLinearGradient(-topW / 2, 0, topW / 2, 0);
    if (waterLevel > 0.05) {
      paperGrad.addColorStop(0, 'rgba(254, 252, 248, 0.88)');
      paperGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.82)');
      paperGrad.addColorStop(0.7, 'rgba(248, 246, 240, 0.85)');
      paperGrad.addColorStop(1, 'rgba(241, 238, 230, 0.90)');
    } else {
      paperGrad.addColorStop(0, '#fdfbf7');
      paperGrad.addColorStop(0.3, '#ffffff');
      paperGrad.addColorStop(0.7, '#fbf9f4');
      paperGrad.addColorStop(1, '#f3efe6');
    }

    ctx.fillStyle = paperGrad;
    ctx.beginPath();
    ctx.moveTo(-topW / 2, topY);
    ctx.lineTo(topW / 2, topY);
    ctx.lineTo(botW / 2, botY);
    ctx.lineTo(-botW / 2, botY);
    ctx.closePath();
    ctx.fill();

    // Subtle edge shading for 3D cylindrical paper cup volume
    const shadeGrad = ctx.createLinearGradient(-topW / 2, 0, topW / 2, 0);
    shadeGrad.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
    shadeGrad.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
    shadeGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
    shadeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    ctx.fillStyle = shadeGrad;
    ctx.beginPath();
    ctx.moveTo(-topW / 2, topY);
    ctx.lineTo(topW / 2, topY);
    ctx.lineTo(botW / 2, botY);
    ctx.lineTo(-botW / 2, botY);
    ctx.closePath();
    ctx.fill();

    // 5. Classic Red Decorative Stripe Band (iconic Japanese paper cup design)
    const bandY = -h / 4;
    const bandH = 8;
    const tBand = (bandY - topY) / h;
    const bandW = topW * (1 - tBand) + botW * tBand;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-bandW / 2 + 2, bandY, bandW - 4, bandH, 1);
    ctx.fill();

    // Thin white accent line inside red band
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-bandW / 2 + 4, bandY + bandH / 2);
    ctx.lineTo(bandW / 2 - 4, bandY + bandH / 2);
    ctx.stroke();

    // 6. Folded Bottom Base Rim
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-botW / 2 + 1, botY - 3);
    ctx.lineTo(botW / 2 - 1, botY - 3);
    ctx.stroke();

    // Cup outline border
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-topW / 2, topY);
    ctx.lineTo(-botW / 2, botY);
    ctx.lineTo(botW / 2, botY);
    ctx.lineTo(topW / 2, topY);
    ctx.stroke();

    // 7. Top Rolled Paper Lip (丸いフチの立体感)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, topY, topW / 2 + 1.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner rim hole opening
    ctx.fillStyle = waterLevel >= 0.95 ? 'rgba(56, 189, 248, 0.85)' : '#eae5db';
    ctx.beginPath();
    ctx.ellipse(0, topY, topW / 2 - 2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8. Overflow Visual Effect (あふれ出る水のエフェクト)
    if (isOverflowing || waterLevel >= 0.98) {
      // Shimmering spill crest over the rim
      ctx.fillStyle = 'rgba(125, 211, 252, 0.95)'; // sky-300
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      // Spilling droplet/sheen on left or right rim depending on tilt
      const spillSide = body.angle > 0.05 ? 1 : body.angle < -0.05 ? -1 : (Date.now() % 400 > 200 ? 1 : -1);
      const spillRimX = spillSide * (topW / 2);

      // Droplet bead spilling over
      ctx.beginPath();
      ctx.ellipse(spillRimX, topY + 2, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sparkle glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(spillRimX + (spillSide > 0 ? 1 : -1), topY + 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

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
    const handleDist = 52;
    const handleX = x + Math.cos(body.angle) * handleDist;
    const handleY = y + Math.sin(body.angle) * handleDist;

    ctx.save();
    // Connecting dashed line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(handleX, handleY);
    ctx.stroke();

    // Touch ring outer halo
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(handleX, handleY, 14, 0, Math.PI * 2);
    ctx.fill();

    // Circle knob
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(handleX, handleY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Degree readout pill badge
    const deg = Math.round(((body.angle * 180) / Math.PI) % 360);
    const normalizedDeg = deg < 0 ? deg + 360 : deg;
    const text = `${normalizedDeg}°`;
    ctx.font = 'bold 11px monospace';
    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const badgeX = handleX + 16;
    const badgeY = handleY - 8;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX - 4, badgeY - 10, textW + 8, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, badgeX, badgeY + 2);

    ctx.restore();
  }

  // Kitchen Funnel / Spiral Bowl (すり鉢ロート・じょうご)
  private drawFunnel(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const w = gadget?.options?.width || 130;
    const h = gadget?.options?.height || 75;
    const holeW = 34;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, h / 2, w / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ceramic Funnel Bowl Outer Body
    const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.5, '#e2e8f0');
    grad.addColorStop(1, '#cbd5e1');

    // Funnel bowl contour
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(holeW / 2 + 4, h / 2 - 12);
    ctx.lineTo(holeW / 2 + 4, h / 2);
    ctx.lineTo(-holeW / 2 - 4, h / 2);
    ctx.lineTo(-holeW / 2 - 4, h / 2 - 12);
    ctx.closePath();
    ctx.fill();

    // Inner Bowl Contour (darker interior depth)
    const innerGrad = ctx.createRadialGradient(0, -h / 4, 8, 0, -h / 4, w / 2);
    innerGrad.addColorStop(0, '#334155');
    innerGrad.addColorStop(0.7, '#1e293b');
    innerGrad.addColorStop(1, '#0f172a');

    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(0, -h / 2 + 6, w / 2 - 6, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Concentric spiral/depth rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -h / 2 + 18, w * 0.35, 7, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center hole opening
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.ellipse(0, h / 2 - 12, holeW / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bowl outline rim
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Decorative colored rim band (cyan ribbon)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -h / 2 + 6, w / 2 - 4, 12, 0, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  // Desk Bell / Glockenspiel Bar (卓上ベル・鉄琴プレート)
  private drawBell(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const note = gadget?.options?.note || 'C5';
    const noteLabels: Record<string, string> = {
      'C5': 'ド', 'D5': 'レ', 'E5': 'ミ', 'F5': 'ファ',
      'G5': 'ソ', 'A5': 'ラ', 'B5': 'シ', 'C6': '高ド'
    };
    const noteColors: Record<string, string> = {
      'C5': '#ef4444', 'D5': '#f97316', 'E5': '#eab308', 'F5': '#22c55e',
      'G5': '#06b6d4', 'A5': '#3b82f6', 'B5': '#a855f7', 'C6': '#ec4899'
    };

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    const lastHit = (body.plugin as any)?.lastHitTime || 0;
    const timeSinceHit = Date.now() - lastHit;

    // Acoustic resonance wave rings on hit
    if (timeSinceHit < 500) {
      const progress = timeSinceHit / 500;
      const radius = 22 + progress * 30;
      const alpha = (1 - progress) * 0.8;
      ctx.strokeStyle = `rgba(253, 224, 71, ${alpha})`;
      ctx.lineWidth = 2.5 * (1 - progress);
      ctx.beginPath();
      ctx.arc(0, -6, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Desk bell base plate
    const baseGrad = ctx.createLinearGradient(-24, 10, 24, 10);
    baseGrad.addColorStop(0, '#475569');
    baseGrad.addColorStop(0.5, '#94a3b8');
    baseGrad.addColorStop(1, '#475569');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.roundRect(-24, 8, 48, 8, 3);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Gleaming brass dome
    const domeGrad = ctx.createRadialGradient(-6, -8, 2, 0, 0, 24);
    domeGrad.addColorStop(0, '#fef08a'); // specular highlight
    domeGrad.addColorStop(0.3, '#eab308'); // gold
    domeGrad.addColorStop(0.7, '#ca8a04'); // rich brass
    domeGrad.addColorStop(1, '#854d0e'); // dark bronze shadow

    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(0, 8, 22, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top plunger shaft & button
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-2.5, -18, 5, 8);
    ctx.beginPath();
    ctx.ellipse(0, -18, 6, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.stroke();

    // Note badge on bell dome
    const badgeColor = noteColors[note] || '#ef4444';
    const noteText = noteLabels[note] || note;
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(noteText, 0, 0.5);

    ctx.restore();
  }

  // Paddle Wheel (回転パドル水車)
  private drawPaddleWheel(ctx: CanvasRenderingContext2D, bundle: { mainBody: Matter.Body }) {
    const wheel = bundle.mainBody;
    const { x, y } = wheel.position;
    const spokeCount = (wheel.plugin?.gadget?.options?.spokes as number) || 4;
    const diameter = 96;
    const r = diameter / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wheel.angle);

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(2, 3, r, 0, Math.PI * 2);
    ctx.fill();

    // Draw paddles
    const paddleGrad = ctx.createLinearGradient(-r, 0, r, 0);
    paddleGrad.addColorStop(0, '#b45309');
    paddleGrad.addColorStop(0.5, '#f59e0b');
    paddleGrad.addColorStop(1, '#b45309');

    const count = spokeCount === 6 ? 6 : 4;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const ang = i * step;
      ctx.save();
      ctx.rotate(ang);

      // Wooden paddle blade
      ctx.fillStyle = paddleGrad;
      ctx.beginPath();
      ctx.roundRect(8, -6, r - 8, 12, 3);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Paddle end scoop rim
      ctx.fillStyle = '#d97706';
      ctx.fillRect(r - 7, -8, 6, 16);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1;
      ctx.strokeRect(r - 7, -8, 6, 16);

      ctx.restore();
    }

    // Central hub & brass bearing pin
    const hubGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 16);
    hubGrad.addColorStop(0, '#fef08a');
    hubGrad.addColorStop(0.5, '#d97706');
    hubGrad.addColorStop(1, '#78350f');

    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Axle bolt
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Pulley & Bucket Elevator (滑車バケツ・エレベーター)
  private drawPulley(ctx: CanvasRenderingContext2D, bundle: { bodies: Matter.Body[]; mainBody: Matter.Body }) {
    const anchor = bundle.mainBody;
    const { bucketLeft, bucketRight } = anchor.plugin || {};
    const { x, y } = anchor.position;

    ctx.save();

    // 1. Pulley Wheel Anchor & Bracket
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 3, y - 24, 6, 24);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(x - 3, y - 24, 6, 24);

    // Pulley grooved wheel
    const wheelGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 16);
    wheelGrad.addColorStop(0, '#94a3b8');
    wheelGrad.addColorStop(0.6, '#475569');
    wheelGrad.addColorStop(1, '#1e293b');

    ctx.fillStyle = wheelGrad;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axle pin
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Suspension Ropes & Buckets
    if (bucketLeft && bucketRight) {
      const bW = anchor.plugin?.bW || 86;
      const bH = anchor.plugin?.bH || 46;

      ctx.strokeStyle = '#fde68a'; // hemp rope color
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Left rope
      ctx.moveTo(x - 14, y);
      ctx.lineTo(bucketLeft.position.x, bucketLeft.position.y - bH / 2 - 12);
      // Over wheel arc
      ctx.arc(x, y, 14, Math.PI, 0, false);
      // Right rope
      ctx.lineTo(bucketRight.position.x, bucketRight.position.y - bH / 2 - 12);
      ctx.stroke();

      // 3. Draw Buckets
      const drawBucket = (b: Matter.Body, isLeft: boolean) => {
        ctx.save();
        ctx.translate(b.position.x, b.position.y);
        ctx.rotate(b.angle);

        const rawWater = isLeft
          ? (anchor.plugin?.waterLevelLeft ?? b.plugin?.waterLevel ?? 0)
          : (anchor.plugin?.waterLevelRight ?? b.plugin?.waterLevel ?? 0);
        const waterLevel = Math.max(0, Math.min(1, rawWater));
        const isOverflowing = isLeft
          ? !!anchor.plugin?.isOverflowingLeft
          : !!anchor.plugin?.isOverflowingRight;

        const wallTh = anchor.plugin?.wallTh || 6;
        const bottomTh = anchor.plugin?.bottomTh || 18;
        const innerW = bW - 2 * wallTh;
        const floorY = bH / 2 - bottomTh;
        const topY = -bH / 2 + 4;
        const maxWaterH = floorY - topY;

        // Wire bail handle (drawn behind bucket)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bW / 2 + 6, -bH / 2 + 6);
        ctx.lineTo(0, -bH / 2 - 12);
        ctx.lineTo(bW / 2 - 6, -bH / 2 + 6);
        ctx.stroke();

        // Wooden bucket body silhouette
        const bucketGrad = ctx.createLinearGradient(-bW / 2, 0, bW / 2, 0);
        bucketGrad.addColorStop(0, '#92400e');
        bucketGrad.addColorStop(0.2, '#b45309');
        bucketGrad.addColorStop(0.5, '#d97706');
        bucketGrad.addColorStop(0.8, '#b45309');
        bucketGrad.addColorStop(1, '#78350f');

        ctx.fillStyle = bucketGrad;
        ctx.beginPath();
        ctx.roundRect(-bW / 2, -bH / 2 + 4, bW, bH - 4, [3, 3, 10, 10]);
        ctx.fill();

        // Hollow interior cavity (dark shaded oak interior)
        const innerGrad = ctx.createLinearGradient(0, topY, 0, floorY);
        innerGrad.addColorStop(0, '#291403');
        innerGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.roundRect(-innerW / 2, topY, innerW, maxWaterH, [1, 1, 4, 4]);
        ctx.fill();

        // Water Liquid inside cavity
        if (waterLevel > 0.005) {
          const liquidH = maxWaterH * waterLevel;
          const surfaceY = floorY - liquidH;

          // Sparkling translucent water gradient
          const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, floorY);
          waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.90)'); // bright sky blue
          waterGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.92)'); // cerulean
          waterGrad.addColorStop(1, 'rgba(3, 105, 161, 0.96)'); // deep ocean blue

          ctx.fillStyle = waterGrad;
          ctx.beginPath();
          ctx.roundRect(-innerW / 2, surfaceY, innerW, liquidH, [0, 0, 4, 4]);
          ctx.fill();

          // Surface line & glistening meniscus highlight
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (waterLevel >= 0.98) {
            // Convex surface tension curve bulging slightly above the rim
            ctx.moveTo(-innerW / 2, surfaceY);
            ctx.quadraticCurveTo(0, surfaceY - 2.5, innerW / 2, surfaceY);
          } else {
            ctx.moveTo(-innerW / 2, surfaceY);
            ctx.lineTo(innerW / 2, surfaceY);
          }
          ctx.stroke();

          // Water surface specular reflection gleam
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.ellipse(-innerW / 4, surfaceY + 1.5, innerW / 5, 1.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Rising micro-bubbles
          if (waterLevel > 0.15) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.beginPath();
            ctx.arc(-12, surfaceY + liquidH * 0.45, 1.2, 0, Math.PI * 2);
            ctx.arc(16, surfaceY + liquidH * 0.65, 1.5, 0, Math.PI * 2);
            ctx.arc(-4, surfaceY + liquidH * 0.8, 1.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Wooden outer outline & bevel
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(-bW / 2, -bH / 2 + 4, bW, bH - 4, [3, 3, 10, 10]);
        ctx.stroke();

        // Steel hoops (metal bands)
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-bW / 2 + 1, -bH / 2 + 14, bW - 2, 3.5);
        ctx.fillRect(-bW / 2 + 1, bH / 2 - 10, bW - 2, 3.5);

        // Metal hoop highlight lines
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-bW / 2 + 2, -bH / 2 + 14, bW - 4, 1);
        ctx.fillRect(-bW / 2 + 2, bH / 2 - 10, bW - 4, 1);

        // Rivets on metal bands
        ctx.fillStyle = '#cbd5e1';
        [-bW / 2 + 5, -12, 12, bW / 2 - 5].forEach(rx => {
          ctx.beginPath();
          ctx.arc(rx, -bH / 2 + 15.5, 1.2, 0, Math.PI * 2);
          ctx.arc(rx, bH / 2 - 8.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Overflow spilling drips and droplets
        if (isOverflowing || waterLevel >= 0.98) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.2;

          // Left rim spill
          ctx.beginPath();
          ctx.moveTo(-bW / 2 + 1, topY);
          ctx.quadraticCurveTo(-bW / 2 - 4, topY + 4, -bW / 2 + 1, topY + 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Right rim spill
          ctx.beginPath();
          ctx.moveTo(bW / 2 - 1, topY);
          ctx.quadraticCurveTo(bW / 2 + 4, topY + 4, bW / 2 - 1, topY + 9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Animated dripping splash droplets
          const t = Date.now() / 150;
          const dropOffset = (t % 1) * 8;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.beginPath();
          ctx.arc(-bW / 2 - 3, topY + 10 + dropOffset, 1.8, 0, Math.PI * 2);
          ctx.arc(bW / 2 + 3, topY + 10 + dropOffset, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      drawBucket(bucketLeft, true);
      drawBucket(bucketRight, false);
    }

    ctx.restore();
  }

  // Spoon Lever Catapult (てこカタパルト・跳ね上げスプーン)
  private drawCatapult(ctx: CanvasRenderingContext2D, bundle: { bodies: Matter.Body[]; mainBody: Matter.Body }) {
    const arm = bundle.bodies.find(b => b.label === 'catapult_arm') || bundle.mainBody;
    const fulcrum = bundle.bodies.find(b => b.label === 'catapult_fulcrum');

    // 1. Fulcrum Stand
    if (fulcrum) {
      ctx.save();
      ctx.translate(fulcrum.position.x, fulcrum.position.y);
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

      // Pivot bolt
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -12, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Catapult Lever Arm
    if (arm) {
      ctx.save();
      ctx.translate(arm.position.x, arm.position.y);
      ctx.rotate(arm.angle);

      // Wooden lever bar
      const barGrad = ctx.createLinearGradient(-60, 0, 100, 0);
      barGrad.addColorStop(0, '#b45309');
      barGrad.addColorStop(0.5, '#d97706');
      barGrad.addColorStop(1, '#b45309');

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(-60, -5, 160, 10, 3);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Left heavy striker anvil pad
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-70, -18, 36, 14, 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Target red dot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-52, -11, 4, 0, Math.PI * 2);
      ctx.fill();

      // Right cupped spoon launcher
      ctx.fillStyle = '#e2e8f0'; // white/chrome spoon
      ctx.beginPath();
      ctx.arc(92, -8, 14, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  // Faucet (蛇口 - 金属パイプ・ノズル・蛇口ハンドル)
  private drawFaucet(ctx: CanvasRenderingContext2D, body: Matter.Body, isRunning: boolean) {
    const { x, y } = body.position;
    const gadget = body.plugin?.gadget as GadgetData | undefined;
    const isOpen = body.plugin?.isOpen ?? (gadget?.options?.autoFlow ?? true);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(4, 18, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wall mounting flange (left circular plate)
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(-26, -12, 8, 24, 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Chrome pipe gradient
    const pipeGrad = ctx.createLinearGradient(0, -8, 0, 8);
    pipeGrad.addColorStop(0, '#f1f5f9');
    pipeGrad.addColorStop(0.3, '#cbd5e1');
    pipeGrad.addColorStop(0.7, '#64748b');
    pipeGrad.addColorStop(1, '#475569');

    // Horizontal pipe neck
    ctx.fillStyle = pipeGrad;
    ctx.beginPath();
    ctx.roundRect(-20, -7, 28, 14, 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Curved elbow bend down into nozzle spout
    const spoutGrad = ctx.createLinearGradient(6, 0, 22, 0);
    spoutGrad.addColorStop(0, '#f8fafc');
    spoutGrad.addColorStop(0.4, '#cbd5e1');
    spoutGrad.addColorStop(0.8, '#64748b');
    spoutGrad.addColorStop(1, '#334155');

    ctx.fillStyle = spoutGrad;
    ctx.beginPath();
    ctx.moveTo(8, -7);
    ctx.quadraticCurveTo(22, -7, 22, 8);
    ctx.lineTo(22, 20);
    ctx.lineTo(8, 20);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Spout aerator nozzle tip
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(7, 18, 16, 4, 1);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Faucet Handle Valve (on top of pipe at x = -2)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-4, -14, 4, 8);

    // Cross handle (Classic Red / Blue tap wheel)
    const handleColor = isOpen ? '#ef4444' : '#3b82f6';
    const handleAngle = isOpen ? (isRunning ? (Date.now() / 150) % (Math.PI * 2) : 0.3) : 0;

    ctx.save();
    ctx.translate(-2, -16);
    ctx.rotate(handleAngle);

    // 4-prong cross handle
    ctx.fillStyle = handleColor;
    ctx.beginPath();
    ctx.roundRect(-12, -3.5, 24, 7, 3);
    ctx.roundRect(-3.5, -12, 7, 24, 3);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center screw cap
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // If flowing, draw forming water droplet glint at the spout
    if (isOpen) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.arc(15, 22, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(14, 21, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Water Droplet (光沢のある水滴)
  private drawWaterDrop(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    const { x, y } = body.position;
    const r = (body.circleRadius as number) || 5;

    ctx.save();
    ctx.translate(x, y);

    // Glassy cyan/blue droplet gradient
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#bae6fd');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(0.9, '#0284c7');
    grad.addColorStop(1, '#0369a1');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Outer liquid glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Specular white glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

