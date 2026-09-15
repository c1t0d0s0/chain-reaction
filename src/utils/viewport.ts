import { GadgetData, ViewportTransform } from '../types';

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculates the bounding box of all gadgets in world coordinates.
 */
export function calculateGadgetBounds(gadgets: GadgetData[]): Bounds | null {
  if (!gadgets || gadgets.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const g of gadgets) {
    const halfW = (g.options?.width ? g.options.width / 2 : (g.options?.radius || 30)) + 12;
    const halfH = (g.options?.height ? g.options.height / 2 : (g.options?.radius || 30)) + 12;

    minX = Math.min(minX, g.x - halfW);
    maxX = Math.max(maxX, g.x + halfW);
    minY = Math.min(minY, g.y - halfH);
    maxY = Math.max(maxY, g.y + halfH);
  }

  if (!isFinite(minX) || !isFinite(minY)) return null;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export interface RoomBounds {
  leftWallX: number;
  rightWallX: number;
  floorY: number;
  topY: number;
}

export const DEFAULT_ROOM_BOUNDS: RoomBounds = {
  leftWallX: 20,
  rightWallX: 1240,
  floorY: 660,
  topY: 20,
};

/**
 * Determines the optimal viewport transform so that all gadgets, the left/right walls,
 * and the floor are immediately visible on screen without requiring manual zoom out.
 */
export function getOptimalViewport(
  gadgets: GadgetData[],
  canvasWidth: number,
  canvasHeight: number,
  savedViewport?: ViewportTransform
): ViewportTransform {
  const gadgetBounds = calculateGadgetBounds(gadgets);

  // Combine gadget bounds with physical room boundaries (left/right walls, floor)
  const minX = gadgetBounds ? Math.min(DEFAULT_ROOM_BOUNDS.leftWallX, gadgetBounds.minX) : DEFAULT_ROOM_BOUNDS.leftWallX;
  const maxX = gadgetBounds ? Math.max(DEFAULT_ROOM_BOUNDS.rightWallX, gadgetBounds.maxX) : DEFAULT_ROOM_BOUNDS.rightWallX;
  const minY = gadgetBounds ? Math.min(DEFAULT_ROOM_BOUNDS.topY, gadgetBounds.minY) : DEFAULT_ROOM_BOUNDS.topY;
  const maxY = gadgetBounds ? Math.max(DEFAULT_ROOM_BOUNDS.floorY, gadgetBounds.maxY) : DEFAULT_ROOM_BOUNDS.floorY;

  const roomW = maxX - minX;
  const roomH = maxY - minY;

  // Desired breathing margins
  const padSide = 32;   // Clearance for wall pillars (24px + 8px margin)
  const padTop = 40;    // Clearance under header/toolbar
  const padBottom = 44; // Visible floor strip at canvas bottom

  // Case 1: Saved viewport exists in imported data
  if (savedViewport && canvasWidth > 0 && canvasHeight > 0) {
    let adjustedX = savedViewport.x;
    let adjustedY = savedViewport.y;
    const scale = savedViewport.scale || 1.0;

    // Check if the top-most content would be above screen
    const screenMinY = minY * scale + adjustedY;
    if (screenMinY < padTop) {
      adjustedY += (padTop - screenMinY);
    }

    // Check if floor would be pushed completely off bottom of screen
    const screenFloorY = maxY * scale + adjustedY;
    if (screenFloorY > canvasHeight - padBottom + 10) {
      adjustedY -= (screenFloorY - (canvasHeight - padBottom));
    }

    // Check if left wall is off screen
    const screenMinX = minX * scale + adjustedX;
    if (screenMinX < padSide) {
      adjustedX += (padSide - screenMinX);
    }

    // Check if right wall is off screen
    const screenMaxX = maxX * scale + adjustedX;
    if (screenMaxX > canvasWidth - padSide) {
      adjustedX -= (screenMaxX - (canvasWidth - padSide));
    }

    return {
      x: Math.round(adjustedX),
      y: Math.round(adjustedY),
      scale,
    };
  }

  // Case 2: Auto-calculate best framing so room boundaries and gadgets fit canvas
  const effectiveCanvasW = canvasWidth > 0 ? canvasWidth : 1200;
  const effectiveCanvasH = canvasHeight > 0 ? canvasHeight : 750;

  const availW = Math.max(100, effectiveCanvasW - padSide * 2);
  const availH = Math.max(100, effectiveCanvasH - (padTop + padBottom));

  const scaleX = availW / roomW;
  const scaleY = availH / roomH;
  const fitScale = Math.min(scaleX, scaleY);

  // Clamp scale between 0.4 and 1.0 (so standard/large screens don't overzoom)
  const scale = Math.min(1.0, Math.max(0.4, Number(fitScale.toFixed(2))));

  // Center horizontally within canvas
  const scaledRoomW = roomW * scale;
  const x = Math.round((effectiveCanvasW - scaledRoomW) / 2 - minX * scale);

  // Position vertically so the floor surface is clearly visible with a bottom strip
  const y = Math.round((effectiveCanvasH - padBottom) - maxY * scale);

  return {
    x,
    y,
    scale,
  };
}

/**
 * Zooms centered on a specific screen point (e.g. center of the canvas).
 */
export function zoomCentered(
  current: ViewportTransform,
  factor: number,
  center: { x: number; y: number }
): ViewportTransform {
  const newScale = Math.min(Math.max(current.scale * factor, 0.35), 3.0);
  const newX = center.x - (center.x - current.x) * (newScale / current.scale);
  const newY = center.y - (center.y - current.y) * (newScale / current.scale);

  return {
    x: Math.round(newX * 10) / 10,
    y: Math.round(newY * 10) / 10,
    scale: Math.round(newScale * 1000) / 1000,
  };
}
