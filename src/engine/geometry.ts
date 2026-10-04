import type { Orientation, CargoItem } from "./types";

export interface Dim3 {
  l: number;
  w: number;
  h: number;
}

export function orient(l: number, w: number, h: number, o: Orientation): Dim3 {
  switch (o) {
    case "LWH": return { l, w, h };
    case "LHW": return { l, w: h, h: w };
    case "WLH": return { l: w, w: l, h };
    case "WHL": return { l: w, w: h, h: l };
    case "HLW": return { l: h, w: l, h: w };
    case "HWL": return { l: h, w, h: l };
  }
}

export function allowedOrientations(item: CargoItem): Orientation[] {
  if (!item.rotatable) return ["LWH"];
  // Keep upright: height axis must not change (h stays h).
  if (item.keepUpright) return ["LWH", "WLH"];
  return ["LWH", "LHW", "WLH", "WHL", "HLW", "HWL"];
}

export interface AABB {
  x: number;
  y: number;
  z: number;
  l: number;
  w: number;
  h: number;
}

export function overlaps(a: AABB, b: AABB): boolean {
  // Strict overlap; touching faces (shared boundary) do not count as overlap.
  const EPS = 0.0001;
  return (
    a.x < b.x + b.l - EPS && a.x + a.l > b.x + EPS &&
    a.y < b.y + b.w - EPS && a.y + a.w > b.y + EPS &&
    a.z < b.z + b.h - EPS && a.z + a.h > b.z + EPS
  );
}

export function insideTruck(
  a: AABB,
  truckLength: number,
  truckWidth: number,
  truckHeight: number
): boolean {
  return (
    a.x >= 0 &&
    a.y >= 0 &&
    a.z >= 0 &&
    a.x + a.l <= truckLength + 0.0001 &&
    a.y + a.w <= truckWidth + 0.0001 &&
    a.z + a.h <= truckHeight + 0.0001
  );
}
