// skill-geometry.mjs: the shared geometry of the stack row strips, matching how
// skillicons.dev lays out its icons: 256-unit tiles on a 300-unit stride (a 44-unit
// gap), eight tiles per line, the last line padded but never stretched, every row
// the same total width, displayed at 48 px per tile.
export const TILE = 256;
export const STRIDE = 300;
export const GAP = STRIDE - TILE;
export const PER_LINE = 8;
export const PX = 48 / TILE;

export const unitsWidth = PER_LINE * STRIDE - GAP;
export const unitsHeight = (lines) => lines * STRIDE - GAP;
export const pxWidth = Math.round(unitsWidth * PX);
export const pxHeight = (lines) => Math.round(unitsHeight(lines) * PX);
