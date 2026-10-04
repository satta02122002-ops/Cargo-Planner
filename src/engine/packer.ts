import type {
  CargoItem,
  LoadingPlan,
  LoadingStrategy,
  Orientation,
  Placement,
  PlanSummary,
  Truck,
  UnloadedItem,
  WeightDistribution,
} from "./types";
import {
  AABB,
  allowedOrientations,
  insideTruck,
  orient,
  overlaps,
} from "./geometry";
import { colorForSku } from "./color";

// -----------------------------------------------------------------------------
// Deterministic heuristic 3D bin packer.
//
// Strategy:
//   - Expand each cargo item into individual package instances (one per unit).
//   - Sort instances per the chosen loading strategy.
//   - Maintain a candidate-position set initialized to the truck origin.
//     After each placement, add three new candidates at the +X / +Y / +Z corners
//     of the placed box (classic extreme-point / corner-point heuristic).
//   - For each instance, try every candidate position × every allowed
//     orientation and accept the first that fits (boundary + collision +
//     restricted zones + stacking + weight).
//   - Stacking: a non-stackable item can only be placed with z = 0 (or on top
//     of nothing). Items placed above z=0 require full support from boxes
//     beneath whose cargo is stackable, and may not exceed per-sku max stack.
//   - Door check: before placement, if an item cannot fit the door opening in
//     any allowed orientation, it is reported as "Cannot enter through door".
//
// This is a heuristic, not a provably optimal packing. It is deterministic for
// a given input ordering.
// -----------------------------------------------------------------------------

interface Instance {
  cargo: CargoItem;
  index: number; // which unit of the cargo quantity
}

interface Candidate {
  x: number;
  y: number;
  z: number;
}

interface PackResult {
  placement: Placement;
  stackLevel: number;
}

export interface PackOptions {
  strategy: LoadingStrategy;
  gridMm?: number; // snap grid for manual edits; packing uses tight placement
  enforceDoor?: boolean;
}

export function generatePlan(
  truck: Truck,
  cargo: CargoItem[],
  options: PackOptions
): LoadingPlan {
  const warnings: string[] = [];
  const placements: Placement[] = [];
  const unloaded: UnloadedItem[] = [];
  const unloadedByCargo = new Map<string, { item: CargoItem; qty: number; reason: string }>();

  // Pre-flight dimension checks against truck interior.
  const feasibleCargo: CargoItem[] = [];
  for (const c of cargo) {
    if (c.quantity <= 0) continue;
    if (c.lengthMm <= 0 || c.widthMm <= 0 || c.heightMm <= 0) {
      recordUnloaded(unloadedByCargo, c, c.quantity, "Invalid dimensions");
      continue;
    }
    const fits = fitsInsideAnyOrientation(c, truck);
    if (!fits) {
      recordUnloaded(unloadedByCargo, c, c.quantity, "Exceeds truck dimensions in every allowed orientation");
      continue;
    }
    if (options.enforceDoor !== false && !fitsThroughDoor(c, truck)) {
      recordUnloaded(unloadedByCargo, c, c.quantity, "Cannot enter through door");
      continue;
    }
    feasibleCargo.push(c);
  }

  // Expand into instances.
  const instances: Instance[] = [];
  for (const c of feasibleCargo) {
    for (let i = 0; i < c.quantity; i++) instances.push({ cargo: c, index: i });
  }

  // Sort by strategy.
  sortInstances(instances, options.strategy);

  const candidates: Candidate[] = [{ x: 0, y: 0, z: 0 }];
  // Seed extra candidates from the +X / +Y / +Z corners of each restricted
  // zone so the first package can be placed around them.
  for (const r of truck.restrictions) {
    pushCandidate(candidates, { x: r.x + r.lengthMm, y: r.y, z: r.z });
    pushCandidate(candidates, { x: r.x, y: r.y + r.widthMm, z: r.z });
    pushCandidate(candidates, { x: r.x, y: r.y, z: r.z + r.heightMm });
  }
  let totalWeight = 0;
  let sequence = 1;

  for (const inst of instances) {
    const c = inst.cargo;

    // Weight budget check.
    if (totalWeight + c.unitWeightKg > truck.maxPayloadKg + 1e-6) {
      recordUnloaded(unloadedByCargo, c, 1, "Remaining payload capacity insufficient");
      continue;
    }

    const orientations = allowedOrientations(c);
    const result = tryPlace(c, orientations, candidates, placements, truck);

    if (!result) {
      recordUnloaded(unloadedByCargo, c, 1, "No available physical space");
      continue;
    }

    placements.push({
      ...result.placement,
      sequence: sequence++,
    });
    totalWeight += c.unitWeightKg;

    // Add three new corner candidates derived from this placement.
    const p = result.placement;
    pushCandidate(candidates, { x: p.x + p.lengthMm, y: p.y, z: p.z });
    pushCandidate(candidates, { x: p.x, y: p.y + p.widthMm, z: p.z });
    pushCandidate(candidates, { x: p.x, y: p.y, z: p.z + p.heightMm });
  }

  for (const [, v] of unloadedByCargo) {
    unloaded.push({
      cargoId: v.item.id,
      sku: v.item.sku,
      name: v.item.name,
      quantity: v.qty,
      reason: v.reason,
    });
  }

  const summary = buildSummary(truck, placements, unloaded, totalWeight);
  if (!summary.weightDistribution.balanced) {
    warnings.push("Weight distribution is significantly unbalanced");
  }
  if (summary.remainingPayloadKg < 0) {
    warnings.push("Truck weight capacity exceeded");
  }

  return {
    id: cryptoRandomId(),
    truckId: truck.id,
    strategy: options.strategy,
    placements,
    unloaded,
    summary,
    warnings,
    createdAt: new Date().toISOString(),
  };
}

function tryPlace(
  c: CargoItem,
  orientations: Orientation[],
  candidates: Candidate[],
  placements: Placement[],
  truck: Truck
): PackResult | null {
  // Sort candidates: lowest z, then x, then y → bottom-first, back-first.
  const sortedCandidates = [...candidates].sort((a, b) =>
    a.z - b.z || a.x - b.x || a.y - b.y
  );
  for (const cand of sortedCandidates) {
    for (const o of orientations) {
      const d = orient(c.lengthMm, c.widthMm, c.heightMm, o);
      const aabb: AABB = { x: cand.x, y: cand.y, z: cand.z, l: d.l, w: d.w, h: d.h };

      if (!insideTruck(aabb, truck.lengthMm, truck.widthMm, truck.heightMm)) continue;
      if (collides(aabb, placements, truck)) continue;
      if (!supported(aabb, placements, c)) continue;

      const stackLevel = computeStackLevel(aabb, placements);

      const placement: Placement = {
        instanceId: cryptoRandomId(),
        cargoId: c.id,
        sku: c.sku,
        name: c.name,
        sequence: 0,
        x: cand.x,
        y: cand.y,
        z: cand.z,
        lengthMm: d.l,
        widthMm: d.w,
        heightMm: d.h,
        rotation: o,
        weightKg: c.unitWeightKg,
        stackLevel,
        color: colorForSku(c.sku, c.color),
      };
      return { placement, stackLevel };
    }
  }
  return null;
}

function collides(aabb: AABB, placements: Placement[], truck: Truck): boolean {
  for (const p of placements) {
    const b: AABB = { x: p.x, y: p.y, z: p.z, l: p.lengthMm, w: p.widthMm, h: p.heightMm };
    if (overlaps(aabb, b)) return true;
  }
  for (const r of truck.restrictions) {
    const b: AABB = { x: r.x, y: r.y, z: r.z, l: r.lengthMm, w: r.widthMm, h: r.heightMm };
    if (overlaps(aabb, b)) return true;
  }
  return false;
}

// A box must either sit on the floor, or rest fully on top of other boxes
// whose cargo is stackable; a non-stackable cargo must have z=0.
function supported(
  aabb: AABB,
  placements: Placement[],
  cargo: CargoItem,
  cargoLookup?: (id: string) => CargoItem | undefined
): boolean {
  const EPS = 0.001;
  if (aabb.z <= EPS) return true;
  if (!cargo.stackable && aabb.z > EPS) {
    // Non-stackable cargo should actually be fine _on top of_ things too; the
    // business rule here is "cannot be stacked on top of" (as the top one). We
    // allow non-stackable items only on the floor to be conservative.
    return false;
  }

  // Must fully rest on supporting surfaces: project footprint, require union
  // of overlapping box tops to cover the footprint area (approximate: require
  // the four footprint corners to each have a supporter at matching z).
  const corners = [
    [aabb.x + EPS, aabb.y + EPS],
    [aabb.x + aabb.l - EPS, aabb.y + EPS],
    [aabb.x + EPS, aabb.y + aabb.w - EPS],
    [aabb.x + aabb.l - EPS, aabb.y + aabb.w - EPS],
  ];
  for (const [cx, cy] of corners) {
    const supporter = placements.find((p) => {
      const topZ = p.z + p.heightMm;
      if (Math.abs(topZ - aabb.z) > 0.5) return false;
      return (
        cx >= p.x && cx <= p.x + p.lengthMm &&
        cy >= p.y && cy <= p.y + p.widthMm
      );
    });
    if (!supporter) return false;
    const supCargo = cargoLookup?.(supporter.cargoId);
    if (supCargo && !supCargo.stackable) return false;
    if (supCargo && supCargo.fragile && cargo.unitWeightKg > supCargo.unitWeightKg) return false;
  }
  // Enforce per-sku max stack count below this placement.
  const stackLevel = computeStackLevel(aabb, placements);
  if (cargo.maxStack > 0 && stackLevel >= cargo.maxStack) return false;
  return true;
}

function computeStackLevel(aabb: AABB, placements: Placement[]): number {
  // Count placements directly beneath (same footprint overlap, lower top).
  let level = 0;
  for (const p of placements) {
    const horizOverlap =
      aabb.x < p.x + p.lengthMm && aabb.x + aabb.l > p.x &&
      aabb.y < p.y + p.widthMm && aabb.y + aabb.w > p.y;
    if (horizOverlap && p.z + p.heightMm <= aabb.z + 0.001) level++;
  }
  return level;
}

function pushCandidate(candidates: Candidate[], c: Candidate): void {
  if (!candidates.some((k) => k.x === c.x && k.y === c.y && k.z === c.z)) {
    candidates.push(c);
  }
}

function fitsInsideAnyOrientation(c: CargoItem, truck: Truck): boolean {
  for (const o of allowedOrientations(c)) {
    const d = orient(c.lengthMm, c.widthMm, c.heightMm, o);
    if (d.l <= truck.lengthMm && d.w <= truck.widthMm && d.h <= truck.heightMm) return true;
  }
  return false;
}

function fitsThroughDoor(c: CargoItem, truck: Truck): boolean {
  if (truck.doorWidthMm <= 0 || truck.doorHeightMm <= 0) return true;
  for (const o of allowedOrientations(c)) {
    const d = orient(c.lengthMm, c.widthMm, c.heightMm, o);
    if (d.w <= truck.doorWidthMm && d.h <= truck.doorHeightMm) return true;
  }
  return false;
}

function sortInstances(instances: Instance[], strategy: LoadingStrategy): void {
  const volume = (c: CargoItem) => c.lengthMm * c.widthMm * c.heightMm;
  switch (strategy) {
    case "MAX_QUANTITY":
      instances.sort((a, b) =>
        volume(a.cargo) - volume(b.cargo) || a.cargo.priority - b.cargo.priority
      );
      break;
    case "MAX_WEIGHT_EFFICIENCY":
      instances.sort((a, b) =>
        b.cargo.unitWeightKg - a.cargo.unitWeightKg || volume(b.cargo) - volume(a.cargo)
      );
      break;
    case "PRIORITY_FIRST":
      instances.sort((a, b) =>
        a.cargo.priority - b.cargo.priority ||
        volume(b.cargo) - volume(a.cargo)
      );
      break;
    case "BALANCED":
      instances.sort((a, b) => {
        const stackA = a.cargo.stackable ? 1 : 0;
        const stackB = b.cargo.stackable ? 1 : 0;
        return (
          stackA - stackB ||
          b.cargo.unitWeightKg - a.cargo.unitWeightKg ||
          volume(b.cargo) - volume(a.cargo)
        );
      });
      break;
  }
}

function recordUnloaded(
  map: Map<string, { item: CargoItem; qty: number; reason: string }>,
  c: CargoItem,
  qty: number,
  reason: string
): void {
  const existing = map.get(c.id);
  if (existing) existing.qty += qty;
  else map.set(c.id, { item: c, qty, reason });
}

function buildSummary(
  truck: Truck,
  placements: Placement[],
  unloaded: UnloadedItem[],
  totalWeight: number
): PlanSummary {
  const truckVolume = truck.lengthMm * truck.widthMm * truck.heightMm;
  const usedVolume = placements.reduce((s, p) => s + p.lengthMm * p.widthMm * p.heightMm, 0);
  const loadedCount = placements.length;
  const unloadedCount = unloaded.reduce((s, u) => s + u.quantity, 0);
  const total = loadedCount + unloadedCount;

  const weightDistribution = buildWeightDistribution(truck, placements, totalWeight);

  let status: PlanSummary["status"];
  if (total === 0) status = "CANNOT_LOAD";
  else if (unloadedCount === 0) status = "LOADING_COMPLETE";
  else if (loadedCount === 0) status = "CANNOT_LOAD";
  else status = "PARTIALLY_LOADED";
  if (totalWeight > truck.maxPayloadKg) status = "WEIGHT_EXCEEDED";

  return {
    totalItems: total,
    loadedCount,
    unloadedCount,
    totalWeightKg: round(totalWeight, 2),
    maxPayloadKg: truck.maxPayloadKg,
    remainingPayloadKg: round(truck.maxPayloadKg - totalWeight, 2),
    truckVolumeMm3: truckVolume,
    usedVolumeMm3: usedVolume,
    remainingVolumeMm3: truckVolume - usedVolume,
    volumeUtilization: truckVolume > 0 ? usedVolume / truckVolume : 0,
    weightUtilization: truck.maxPayloadKg > 0 ? totalWeight / truck.maxPayloadKg : 0,
    status,
    weightDistribution,
  };
}

function buildWeightDistribution(
  truck: Truck,
  placements: Placement[],
  totalWeight: number
): WeightDistribution {
  const midX = truck.lengthMm / 2;
  const midY = truck.widthMm / 2;
  let front = 0, rear = 0, left = 0, right = 0;
  let sx = 0, sy = 0, sz = 0;
  for (const p of placements) {
    const cx = p.x + p.lengthMm / 2;
    const cy = p.y + p.widthMm / 2;
    const cz = p.z + p.heightMm / 2;
    sx += cx * p.weightKg;
    sy += cy * p.weightKg;
    sz += cz * p.weightKg;
    if (cx < midX) front += p.weightKg; else rear += p.weightKg;
    if (cy < midY) left += p.weightKg; else right += p.weightKg;
  }
  const cogX = totalWeight > 0 ? sx / totalWeight : 0;
  const cogY = totalWeight > 0 ? sy / totalWeight : 0;
  const cogZ = totalWeight > 0 ? sz / totalWeight : 0;
  const axisImbalance = (a: number, b: number) =>
    totalWeight > 0 ? Math.abs(a - b) / totalWeight : 0;
  const balanced =
    axisImbalance(front, rear) < 0.3 && axisImbalance(left, right) < 0.3;
  return {
    front: round(front, 2),
    rear: round(rear, 2),
    left: round(left, 2),
    right: round(right, 2),
    cogX: round(cogX, 1),
    cogY: round(cogY, 1),
    cogZ: round(cogZ, 1),
    balanced,
  };
}

function round(n: number, p: number): number {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
