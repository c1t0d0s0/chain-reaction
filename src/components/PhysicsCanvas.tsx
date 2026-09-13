import React, { useRef, useEffect, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { GadgetData, GadgetType, ViewportTransform } from '../types';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { CanvasRenderer } from '../rendering/CanvasRenderer';

const { Query, Body } = Matter;

interface PhysicsCanvasProps {
  physics: PhysicsEngine;
  selectedTool: GadgetType | null;
  onClearTool: () => void;
  selectedGadgetId: string | null;
  onSelectGadget: (id: string | null) => void;
  onGadgetCreated: (gadget: GadgetData) => void;
  onGadgetUpdated: (gadget: GadgetData) => void;
  showGrid: boolean;
  transform: ViewportTransform;
  onTransformChange: (t: ViewportTransform) => void;
  followMarble: boolean;
}

export const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  physics,
  selectedTool,
  onClearTool,
  selectedGadgetId,
  onSelectGadget,
  onGadgetCreated,
  onGadgetUpdated,
  showGrid,
  transform,
  onTransformChange,
  followMarble,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer>(new CanvasRenderer());
  const [hoveredGadgetId, setHoveredGadgetId] = useState<string | null>(null);

  // Interaction State
  const isDraggingRef = useRef(false);
  const draggedGadgetIdRef = useRef<string | null>(null);
  const isRotatingRef = useRef(false);
  const isPanningRef = useRef(false);
  const dragStartMouseRef = useRef({ x: 0, y: 0 });
  const dragStartObjPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const isSpacePressedRef = useRef(false);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - transform.x) / transform.scale,
        y: (screenY - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  // Animation & Physics Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(time - lastTime, 33); // Clamp delta to avoid physics explosion
      lastTime = time;

      // 1. Step physics if running
      physics.step(dt);

      // 2. Camera follow marble
      if (followMarble && physics.isRunning && physics.playerMarbleBody) {
        const marblePos = physics.playerMarbleBody.position;
        const canvas = canvasRef.current;
        if (canvas) {
          const targetX = canvas.width / 2 - marblePos.x * transform.scale;
          const targetY = canvas.height / 2 - marblePos.y * transform.scale;
          // Smooth camera lerp
          onTransformChange({
            ...transform,
            x: transform.x + (targetX - transform.x) * 0.08,
            y: transform.y + (targetY - transform.y) * 0.08,
          });
        }
      }

      // 3. Render frame
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          rendererRef.current.render(
            ctx,
            physics,
            transform,
            selectedGadgetId,
            hoveredGadgetId,
            showGrid
          );
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [physics, transform, selectedGadgetId, hoveredGadgetId, showGrid, followMarble, onTransformChange]);

  // Window resize handler & Floor positioning
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        // Position the floor right at the bottom of the screen with a 36px visible floor strip
        const targetFloorY = Math.max(canvas.height - 36, 560);
        physics.setFloor(targetFloorY);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [physics]);

  // Spacebar tracking for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        isSpacePressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Check if point is on the rotation knob of the selected body
  const isOverRotationKnob = (worldPos: { x: number; y: number }, body: Matter.Body) => {
    const handleDist = 48;
    const knobX = body.position.x + Math.cos(body.angle) * handleDist;
    const knobY = body.position.y + Math.sin(body.angle) * handleDist;
    return Math.hypot(worldPos.x - knobX, worldPos.y - knobY) <= 14;
  };

  function distToSegment(
    p: { x: number; y: number },
    v: { x: number; y: number },
    w: { x: number; y: number }
  ): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // Find gadget under mouse cursor with generous hit tolerance and compound body support
  const getGadgetAtPosition = (worldPos: { x: number; y: number }): { id: string; body: Matter.Body } | null => {
    // 1. Direct Matter.js point query
    const allBodies = Array.from(physics.bundles.values()).flatMap((b) => b.bodies);
    const hitBodies = Query.point(allBodies, worldPos);

    if (hitBodies.length > 0) {
      for (let i = hitBodies.length - 1; i >= 0; i--) {
        const b = hitBodies[i];
        const root = b.parent || b;
        const gadgetId = root.plugin?.gadgetId || b.plugin?.gadgetId;
        if (gadgetId) {
          const bundle = physics.bundles.get(gadgetId);
          if (bundle) {
            return { id: gadgetId, body: bundle.mainBody };
          }
        }
      }
    }

    // 2. Proximity check for hollow containers (Paper Cup, Tube), thin objects (Plank, Domino), and strings (Pendulum)
    const padding = 14;
    let closestMatch: { id: string; body: Matter.Body; dist: number } | null = null;

    for (const bundle of physics.bundles.values()) {
      const main = bundle.mainBody;
      const gadget = main.plugin?.gadget as GadgetData | undefined;
      const pos = main.position;

      if (bundle.type === 'paper_cup') {
        const w = (gadget?.options?.width || 56) + padding * 2;
        const h = (gadget?.options?.height || 64) + padding * 2;
        const dx = worldPos.x - pos.x;
        const dy = worldPos.y - pos.y;
        const cos = Math.cos(-main.angle);
        const sin = Math.sin(-main.angle);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) {
          return { id: bundle.gadgetId, body: main };
        }
      } else if (bundle.type === 'toilet_paper_tube') {
        const len = (gadget?.options?.width || 160) + padding * 2;
        const diam = (gadget?.options?.height || 46) + padding * 2;
        const dx = worldPos.x - pos.x;
        const dy = worldPos.y - pos.y;
        const cos = Math.cos(-main.angle);
        const sin = Math.sin(-main.angle);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        if (Math.abs(lx) <= len / 2 && Math.abs(ly) <= diam / 2) {
          return { id: bundle.gadgetId, body: main };
        }
      } else if (bundle.type === 'pendulum') {
        const bob = bundle.bodies.find((b) => b.label === 'pendulum_bob');
        if (bob) {
          const dBob = Math.hypot(worldPos.x - bob.position.x, worldPos.y - bob.position.y);
          if (dBob <= 26) return { id: bundle.gadgetId, body: main };
          const dAnchor = Math.hypot(worldPos.x - pos.x, worldPos.y - pos.y);
          if (dAnchor <= 16) return { id: bundle.gadgetId, body: main };
          const dString = distToSegment(worldPos, pos, bob.position);
          if (dString <= 12) return { id: bundle.gadgetId, body: main };
        }
      } else if (bundle.type === 'goal') {
        // Goal visual: cup from y: 0 to 22 (width 48), arch from y: -32 to 0 (width 40), banner from y: -30 to -14
        const goalW = 64 + padding * 2;
        const goalH = 64 + padding * 2;
        const centerY = pos.y - 5;
        const dx = Math.abs(worldPos.x - pos.x);
        const dy = Math.abs(worldPos.y - centerY);
        if (dx <= goalW / 2 && dy <= goalH / 2) {
          return { id: bundle.gadgetId, body: main };
        }
      } else if (bundle.type === 'start_gate') {
        const gateW = 56 + padding * 2;
        const gateH = 48 + padding * 2;
        const dx = Math.abs(worldPos.x - pos.x);
        const dy = Math.abs(worldPos.y - pos.y);
        if (dx <= gateW / 2 && dy <= gateH / 2) {
          return { id: bundle.gadgetId, body: main };
        }
      } else {
        // Thin bodies / general bounds with tolerance
        const bounds = main.bounds;
        if (
          worldPos.x >= bounds.min.x - padding &&
          worldPos.x <= bounds.max.x + padding &&
          worldPos.y >= bounds.min.y - padding &&
          worldPos.y <= bounds.max.y + padding
        ) {
          const dist = Math.hypot(worldPos.x - pos.x, worldPos.y - pos.y);
          if (!closestMatch || dist < closestMatch.dist) {
            closestMatch = { id: bundle.gadgetId, body: main, dist };
          }
        }
      }
    }

    if (closestMatch) {
      return { id: closestMatch.id, body: closestMatch.body };
    }

    return null;
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(screenPos.x, screenPos.y);

    // 1. Pan with middle button, right button, or Spacebar + Left Click
    if (e.button === 1 || e.button === 2 || isSpacePressedRef.current) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { x: screenPos.x, y: screenPos.y, tx: transform.x, ty: transform.y };
      return;
    }

    if (e.button !== 0) return; // Only left click for interactions below

    // 2. Placing new gadget from palette
    if (selectedTool && !physics.isRunning) {
      const newId = `${selectedTool}-${Date.now()}`;
      const newGadget: GadgetData = {
        id: newId,
        type: selectedTool,
        x: Math.round(worldPos.x),
        y: Math.round(worldPos.y),
        angle: 0,
        options: selectedTool === 'marble' ? { isPlayerBall: false, color: '#3b82f6', radius: 14 } : undefined,
      };

      onGadgetCreated(newGadget);
      onSelectGadget(newId);
      onClearTool();
      return;
    }

    // 3. Check if clicked on rotation knob of already selected gadget
    if (selectedGadgetId && !physics.isRunning) {
      const bundle = physics.bundles.get(selectedGadgetId);
      if (bundle && isOverRotationKnob(worldPos, bundle.mainBody)) {
        isRotatingRef.current = true;
        dragStartMouseRef.current = worldPos;
        return;
      }
    }

    // 4. Clicked an object on canvas
    const hit = getGadgetAtPosition(worldPos);
    if (hit) {
      draggedGadgetIdRef.current = hit.id;
      onSelectGadget(hit.id);
      if (!physics.isRunning) {
        isDraggingRef.current = true;
        dragStartMouseRef.current = worldPos;
        const bundle = physics.bundles.get(hit.id);
        if (bundle) {
          dragStartObjPosRef.current = {
            x: bundle.mainBody.position.x,
            y: bundle.mainBody.position.y,
          };
        }
      }
    } else {
      draggedGadgetIdRef.current = null;
      // Clicked on empty space: deselect
      onSelectGadget(null);
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(screenPos.x, screenPos.y);

    // 1. Handling Panning
    if (isPanningRef.current) {
      const dx = screenPos.x - panStartRef.current.x;
      const dy = screenPos.y - panStartRef.current.y;
      onTransformChange({
        ...transform,
        x: panStartRef.current.tx + dx,
        y: panStartRef.current.ty + dy,
      });
      return;
    }

    // 2. Handling Rotation
    if (isRotatingRef.current && selectedGadgetId) {
      const bundle = physics.bundles.get(selectedGadgetId);
      if (bundle) {
        const dx = worldPos.x - bundle.mainBody.position.x;
        const dy = worldPos.y - bundle.mainBody.position.y;
        let angle = Math.atan2(dy, dx);
        // Snap to 15 degrees if Shift key is held
        if (e.shiftKey) {
          const snapStep = (15 * Math.PI) / 180;
          angle = Math.round(angle / snapStep) * snapStep;
        }

        Body.setAngle(bundle.mainBody, angle);
        const currentData = bundle.mainBody.plugin?.gadget as GadgetData;
        if (currentData) {
          const updated: GadgetData = { ...currentData, angle };
          bundle.mainBody.plugin.gadget = updated;
          physics.updateGadgetSnapshot(updated);
        }
      }
      return;
    }

    // 3. Handling Object Drag Move
    const activeGadgetId = draggedGadgetIdRef.current || selectedGadgetId;
    if (isDraggingRef.current && activeGadgetId) {
      const bundle = physics.bundles.get(activeGadgetId);
      if (bundle) {
        const dx = worldPos.x - dragStartMouseRef.current.x;
        const dy = worldPos.y - dragStartMouseRef.current.y;
        const targetX = Math.round(dragStartObjPosRef.current.x + dx);
        const targetY = Math.round(dragStartObjPosRef.current.y + dy);

        // Update all bodies in the bundle
        const deltaX = targetX - bundle.mainBody.position.x;
        const deltaY = targetY - bundle.mainBody.position.y;

        for (const b of bundle.bodies) {
          Body.setPosition(b, {
            x: b.position.x + deltaX,
            y: b.position.y + deltaY,
          });
        }

        const currentData = bundle.mainBody.plugin?.gadget as GadgetData;
        if (currentData) {
          const updated: GadgetData = { ...currentData, x: targetX, y: targetY };
          bundle.mainBody.plugin.gadget = updated;
          physics.updateGadgetSnapshot(updated);
        }
      }
      return;
    }

    // 4. Update hover state
    const hit = getGadgetAtPosition(worldPos);
    setHoveredGadgetId(hit ? hit.id : null);
  };

  // Mouse Up
  const handleMouseUp = () => {
    const activeGadgetId = draggedGadgetIdRef.current || selectedGadgetId;
    if (isDraggingRef.current && activeGadgetId) {
      const bundle = physics.bundles.get(activeGadgetId);
      if (bundle) {
        const currentData = bundle.mainBody.plugin?.gadget as GadgetData;
        if (currentData) {
          onGadgetUpdated(currentData);
        }
      }
    } else if (isRotatingRef.current && selectedGadgetId) {
      const bundle = physics.bundles.get(selectedGadgetId);
      if (bundle) {
        const currentData = bundle.mainBody.plugin?.gadget as GadgetData;
        if (currentData) {
          onGadgetUpdated(currentData);
        }
      }
    }

    isDraggingRef.current = false;
    draggedGadgetIdRef.current = null;
    isRotatingRef.current = false;
    isPanningRef.current = false;
  };

  // Mouse Wheel (Zoom)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.35), 3.0);

    // Zoom centered around mouse pointer
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    onTransformChange({
      x: newX,
      y: newY,
      scale: newScale,
    });
  };

  // Cursor style calculation
  let cursorStyle = 'default';
  if (isSpacePressedRef.current || isPanningRef.current) {
    cursorStyle = isPanningRef.current ? 'grabbing' : 'grab';
  } else if (isRotatingRef.current) {
    cursorStyle = 'crosshair';
  } else if (isDraggingRef.current) {
    cursorStyle = 'grabbing';
  } else if (selectedTool) {
    cursorStyle = 'crosshair';
  } else if (hoveredGadgetId) {
    cursorStyle = 'pointer';
  }

  return (
    <div className="flex-1 h-full w-full relative overflow-hidden bg-slate-800">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: cursorStyle }}
        className="block w-full h-full"
      />
    </div>
  );
};
