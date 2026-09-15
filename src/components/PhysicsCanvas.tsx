import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Matter from 'matter-js';
import { GadgetData, GadgetType, ViewportTransform } from '../types';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { Sliders } from 'lucide-react';
import { useI18n } from '../i18n';
import { PropertyInspector } from './PropertyInspector';

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
  snapEnabled?: boolean;
  continuousPlacement?: boolean;
  transform: ViewportTransform;
  onTransformChange: (t: ViewportTransform) => void;
  followMarble: boolean;
  onCanvasResize?: (size: { width: number; height: number }) => void;
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
  snapEnabled = false,
  continuousPlacement = false,
  transform,
  onTransformChange,
  followMarble,
  onCanvasResize,
}) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer>(new CanvasRenderer());
  const [hoveredGadgetId, setHoveredGadgetId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Automatically reopen inspector when a gadget is selected
  useEffect(() => {
    if (selectedGadgetId) {
      setIsInspectorOpen(true);
    }
  }, [selectedGadgetId]);

  // Interaction State (Mouse)
  const isDraggingRef = useRef(false);
  const draggedGadgetIdRef = useRef<string | null>(null);
  const isRotatingRef = useRef(false);
  const isPanningRef = useRef(false);
  const dragStartMouseRef = useRef({ x: 0, y: 0 });
  const dragStartObjPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const isSpacePressedRef = useRef(false);

  // Multi-Touch & Tablet Gesture State
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartTransformRef = useRef<ViewportTransform>({ x: 0, y: 0, scale: 1 });
  const pinchStartMidpointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchModeRef = useRef<'none' | 'single' | 'pinch'>('none');
  const touchPanStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const touchHasMovedRef = useRef<boolean>(false);

  // Snapping helpers
  const snapPos = useCallback((x: number, y: number, isSnap: boolean) => {
    if (!isSnap) return { x: Math.round(x), y: Math.round(y) };
    const gridSize = 20;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }, []);

  const snapAngle = useCallback((rad: number, isSnap: boolean) => {
    if (!isSnap) return rad;
    const step = (15 * Math.PI) / 180;
    return Math.round(rad / step) * step;
  }, []);

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

  // Window & Container resize handler with ResizeObserver (guarantees pixel buffer exact match)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const updateSize = () => {
      if (!canvas.parentElement) return;
      const width = canvas.parentElement.clientWidth;
      const height = canvas.parentElement.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        setCanvasSize({ width, height });
        if (onCanvasResize) {
          onCanvasResize({ width, height });
        }
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(canvas.parentElement);

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
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

  // Check if point is on the rotation knob of the selected body (supports wide touch hit zone)
  const isOverRotationKnob = (worldPos: { x: number; y: number }, body: Matter.Body, isTouch: boolean = false) => {
    const handleDist = 52;
    const knobX = body.position.x + Math.cos(body.angle) * handleDist;
    const knobY = body.position.y + Math.sin(body.angle) * handleDist;
    // On touch, provide a generous hit radius (at least 28px in screen space)
    const radius = isTouch ? Math.max(28 / transform.scale, 28) : 16;
    return Math.hypot(worldPos.x - knobX, worldPos.y - knobY) <= radius;
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
      const snapped = snapPos(worldPos.x, worldPos.y, snapEnabled);
      const newId = `${selectedTool}-${Date.now()}`;
      const newGadget: GadgetData = {
        id: newId,
        type: selectedTool,
        x: snapped.x,
        y: snapped.y,
        angle: 0,
        options: selectedTool === 'marble' ? { isPlayerBall: false, color: '#3b82f6', radius: 14 } : undefined,
      };

      onGadgetCreated(newGadget);
      onSelectGadget(newId);
      if (!continuousPlacement) {
        onClearTool();
      }
      return;
    }

    // 3. Check if clicked on rotation knob of already selected gadget
    if (selectedGadgetId && !physics.isRunning) {
      const bundle = physics.bundles.get(selectedGadgetId);
      if (bundle && isOverRotationKnob(worldPos, bundle.mainBody, false)) {
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
      // Clicked on empty space: deselect active gadget
      onSelectGadget(null);
      // Pan canvas by dragging on empty background
      isPanningRef.current = true;
      panStartRef.current = { x: screenPos.x, y: screenPos.y, tx: transform.x, ty: transform.y };
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
        if (e.shiftKey || snapEnabled) {
          angle = snapAngle(angle, true);
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
        let targetX = dragStartObjPosRef.current.x + dx;
        let targetY = dragStartObjPosRef.current.y + dy;

        if (e.shiftKey || snapEnabled) {
          const snapped = snapPos(targetX, targetY, true);
          targetX = snapped.x;
          targetY = snapped.y;
        } else {
          targetX = Math.round(targetX);
          targetY = Math.round(targetY);
        }

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

  // Touch Start (Multi-Touch / Tablet Gestures)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Two-finger Pinch & Pan
    if (e.touches.length === 2) {
      touchModeRef.current = 'pinch';
      isDraggingRef.current = false;
      isRotatingRef.current = false;
      draggedGadgetIdRef.current = null;

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midScreen = {
        x: (t0.clientX + t1.clientX) / 2 - rect.left,
        y: (t0.clientY + t1.clientY) / 2 - rect.top,
      };

      pinchStartDistRef.current = dist;
      pinchStartTransformRef.current = { ...transform };
      pinchStartMidpointRef.current = midScreen;
      return;
    }

    // Single-finger Touch
    if (e.touches.length === 1) {
      touchModeRef.current = 'single';
      touchHasMovedRef.current = false;
      const t = e.touches[0];
      const screenPos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
      const worldPos = screenToWorld(screenPos.x, screenPos.y);

      // 1. Placing new gadget from palette
      if (selectedTool && !physics.isRunning) {
        const snapped = snapPos(worldPos.x, worldPos.y, snapEnabled);
        const newId = `${selectedTool}-${Date.now()}`;
        const newGadget: GadgetData = {
          id: newId,
          type: selectedTool,
          x: snapped.x,
          y: snapped.y,
          angle: 0,
          options: selectedTool === 'marble' ? { isPlayerBall: false, color: '#3b82f6', radius: 14 } : undefined,
        };

        onGadgetCreated(newGadget);
        onSelectGadget(newId);
        if (!continuousPlacement) {
          onClearTool();
        }
        return;
      }

      // 2. Check if touching rotation knob of selected gadget (with enlarged touch radius)
      if (selectedGadgetId && !physics.isRunning) {
        const bundle = physics.bundles.get(selectedGadgetId);
        if (bundle && isOverRotationKnob(worldPos, bundle.mainBody, true)) {
          isRotatingRef.current = true;
          dragStartMouseRef.current = worldPos;
          return;
        }
      }

      // 3. Touching an object
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
        // Potential 1-finger canvas pan if dragged
        touchPanStartRef.current = {
          x: screenPos.x,
          y: screenPos.y,
          tx: transform.x,
          ty: transform.y,
        };
      }
    }
  };

  // Touch Move
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Two-finger Pinch Zoom & Pan
    if (e.touches.length === 2 && touchModeRef.current === 'pinch' && pinchStartDistRef.current) {
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const currentMid = {
        x: (t0.clientX + t1.clientX) / 2 - rect.left,
        y: (t0.clientY + t1.clientY) / 2 - rect.top,
      };

      const scaleRatio = dist / pinchStartDistRef.current;
      const initialTransform = pinchStartTransformRef.current;
      const newScale = Math.min(Math.max(initialTransform.scale * scaleRatio, 0.35), 3.0);

      // Centered zoom around pinch midpoint
      const midStart = pinchStartMidpointRef.current;
      const newX = currentMid.x - (midStart.x - initialTransform.x) * (newScale / initialTransform.scale);
      const newY = currentMid.y - (midStart.y - initialTransform.y) * (newScale / initialTransform.scale);

      onTransformChange({
        x: newX,
        y: newY,
        scale: newScale,
      });
      return;
    }

    // Single-finger Move
    if (e.touches.length === 1 && touchModeRef.current === 'single') {
      const t = e.touches[0];
      const screenPos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
      const worldPos = screenToWorld(screenPos.x, screenPos.y);

      // Rotating
      if (isRotatingRef.current && selectedGadgetId) {
        e.preventDefault();
        touchHasMovedRef.current = true;
        const bundle = physics.bundles.get(selectedGadgetId);
        if (bundle) {
          const dx = worldPos.x - bundle.mainBody.position.x;
          const dy = worldPos.y - bundle.mainBody.position.y;
          let angle = Math.atan2(dy, dx);
          if (snapEnabled) {
            angle = snapAngle(angle, true);
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

      // Dragging Object
      const activeGadgetId = draggedGadgetIdRef.current || selectedGadgetId;
      if (isDraggingRef.current && activeGadgetId) {
        e.preventDefault();
        touchHasMovedRef.current = true;
        const bundle = physics.bundles.get(activeGadgetId);
        if (bundle) {
          const dx = worldPos.x - dragStartMouseRef.current.x;
          const dy = worldPos.y - dragStartMouseRef.current.y;
          let targetX = dragStartObjPosRef.current.x + dx;
          let targetY = dragStartObjPosRef.current.y + dy;

          if (snapEnabled) {
            const snapped = snapPos(targetX, targetY, true);
            targetX = snapped.x;
            targetY = snapped.y;
          } else {
            targetX = Math.round(targetX);
            targetY = Math.round(targetY);
          }

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

      // 1-finger canvas panning on empty background
      if (touchPanStartRef.current) {
        const dx = screenPos.x - touchPanStartRef.current.x;
        const dy = screenPos.y - touchPanStartRef.current.y;
        if (Math.hypot(dx, dy) > 8) {
          e.preventDefault();
          touchHasMovedRef.current = true;
          onTransformChange({
            ...transform,
            x: touchPanStartRef.current.tx + dx,
            y: touchPanStartRef.current.ty + dy,
          });
        }
      }
    }
  };

  // Touch End
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
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
      } else if (!touchHasMovedRef.current && touchPanStartRef.current) {
        // Tapped empty space without dragging: deselect
        onSelectGadget(null);
      }

      isDraggingRef.current = false;
      draggedGadgetIdRef.current = null;
      isRotatingRef.current = false;
      touchModeRef.current = 'none';
      pinchStartDistRef.current = null;
      touchPanStartRef.current = null;
      touchHasMovedRef.current = false;
    } else if (e.touches.length === 1 && touchModeRef.current === 'pinch') {
      touchModeRef.current = 'none';
      pinchStartDistRef.current = null;
    }
  };

  // Quick Action Bar handlers
  const selectedGadget = selectedGadgetId
    ? ((physics.bundles.get(selectedGadgetId)?.mainBody.plugin?.gadget as GadgetData | undefined) || null)
    : null;

  const handleDuplicate = (gadget: GadgetData) => {
    const newId = `${gadget.type}-${Date.now()}`;
    const duplicated: GadgetData = {
      ...gadget,
      id: newId,
      x: gadget.x + 28,
      y: gadget.y + 18,
      options: gadget.options ? JSON.parse(JSON.stringify(gadget.options)) : undefined,
    };
    onGadgetCreated(duplicated);
    onSelectGadget(newId);
  };

  const handleRotateStep = (deltaDeg: number) => {
    if (!selectedGadgetId) return;
    const bundle = physics.bundles.get(selectedGadgetId);
    if (!bundle) return;
    const currentData = bundle.mainBody.plugin?.gadget as GadgetData;
    if (!currentData) return;

    const currentDeg = Math.round((currentData.angle * 180) / Math.PI);
    let targetDeg = (currentDeg + deltaDeg) % 360;
    if (targetDeg < 0) targetDeg += 360;
    const newAngle = (targetDeg * Math.PI) / 180;

    Body.setAngle(bundle.mainBody, newAngle);
    const updated: GadgetData = { ...currentData, angle: newAngle };
    bundle.mainBody.plugin.gadget = updated;
    physics.updateGadgetSnapshot(updated);
    onGadgetUpdated(updated);
  };

  const handleFlip = () => {
    if (!selectedGadgetId) return;
    const bundle = physics.bundles.get(selectedGadgetId);
    if (!bundle) return;
    const currentData = bundle.mainBody.plugin?.gadget as GadgetData;
    if (!currentData) return;

    const newAngle = -currentData.angle;
    Body.setAngle(bundle.mainBody, newAngle);
    const updated: GadgetData = { ...currentData, angle: newAngle };
    bundle.mainBody.plugin.gadget = updated;
    physics.updateGadgetSnapshot(updated);
    onGadgetUpdated(updated);
  };

  const handleDelete = (id: string) => {
    physics.removeGadget(id);
    onSelectGadget(null);
  };

  // Smart docking side calculation: if gadget is on the right half, dock on the left
  const inspectorDockSide = useMemo<'left' | 'right'>(() => {
    if (!selectedGadget) return 'right';
    const screenX = selectedGadget.x * transform.scale + transform.x;
    return screenX > canvasSize.width * 0.52 ? 'left' : 'right';
  }, [selectedGadget, transform, canvasSize.width]);

  const handlePropertyUpdate = (updated: GadgetData) => {
    const bundle = physics.bundles.get(updated.id);
    if (bundle) {
      const oldGadget = bundle.mainBody.plugin?.gadget as GadgetData | undefined;
      const needsRecreate =
        oldGadget?.options?.width !== updated.options?.width ||
        oldGadget?.options?.height !== updated.options?.height ||
        oldGadget?.options?.radius !== updated.options?.radius ||
        oldGadget?.options?.spokes !== updated.options?.spokes ||
        oldGadget?.options?.span !== updated.options?.span ||
        oldGadget?.options?.waterAmount !== updated.options?.waterAmount;

      if (needsRecreate) {
        physics.removeGadget(updated.id);
        physics.addGadget(updated);
      } else {
        Body.setAngle(bundle.mainBody, updated.angle);
        bundle.mainBody.plugin.gadget = updated;
      }
      physics.updateGadgetSnapshot(updated);
    }
    onGadgetUpdated(updated);
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
    <div className="flex-1 h-full w-full relative overflow-hidden bg-slate-800 select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: cursorStyle, touchAction: 'none' }}
        className="block w-full h-full touch-none"
      />

      {selectedGadget && !physics.isRunning && (
        isInspectorOpen ? (
          <PropertyInspector
            gadget={selectedGadget}
            dockSide={inspectorDockSide}
            onUpdate={handlePropertyUpdate}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onFlip={handleFlip}
            onRotateStep={handleRotateStep}
            onClose={() => setIsInspectorOpen(false)}
          />
        ) : (
          /* Re-open button when inspector is closed */
          <button
            type="button"
            onClick={() => setIsInspectorOpen(true)}
            className={`absolute top-4 ${inspectorDockSide === 'left' ? 'left-4' : 'right-4'} z-30 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 hover:text-white border border-slate-700/80 shadow-lg text-xs font-medium transition active:scale-95`}
            title={t('settingsTip')}
          >
            <Sliders className="w-4 h-4" />
            <span>{t('settings')}</span>
          </button>
        )
      )}
    </div>
  );
};
