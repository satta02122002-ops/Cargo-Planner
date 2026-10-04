import type { CargoItem, Placement, Truck } from "./types";
import { AABB, insideTruck, overlaps } from "./geometry";

export interface PlacementIssue {
  severity: "error" | "warning";
  code:
    | "OUT_OF_BOUNDS"
    | "COLLIDES"
    | "WEIGHT_EXCEEDED"
    | "RESTRICTED_ZONE"
    | "UNSTABLE"
    | "STACK_LIMIT";
  message: string;
  placementId?: string;
}

export function validatePlacement(
  candidate: Placement,
  others: Placement[],
  truck: Truck,
  cargoById?: Map<string, CargoItem>
): PlacementIssue[] {
  const issues: PlacementIssue[] = [];
  const aabb: AABB = {
    x: candidate.x, y: candidate.y, z: candidate.z,
    l: candidate.lengthMm, w: candidate.widthMm, h: candidate.heightMm,
  };
  if (!insideTruck(aabb, truck.lengthMm, truck.widthMm, truck.heightMm)) {
    issues.push({
      severity: "error",
      code: "OUT_OF_BOUNDS",
      message: "Package extends outside the truck interior.",
      placementId: candidate.instanceId,
    });
  }
  for (const p of others) {
    if (p.instanceId === candidate.instanceId) continue;
    const b: AABB = { x: p.x, y: p.y, z: p.z, l: p.lengthMm, w: p.widthMm, h: p.heightMm };
    if (overlaps(aabb, b)) {
      issues.push({
        severity: "error",
        code: "COLLIDES",
        message: `Package overlaps with ${p.sku} (seq ${p.sequence}).`,
        placementId: candidate.instanceId,
      });
      break;
    }
  }
  for (const r of truck.restrictions) {
    const b: AABB = { x: r.x, y: r.y, z: r.z, l: r.lengthMm, w: r.widthMm, h: r.heightMm };
    if (overlaps(aabb, b)) {
      issues.push({
        severity: "error",
        code: "RESTRICTED_ZONE",
        message: `Package overlaps restricted zone "${r.label}".`,
        placementId: candidate.instanceId,
      });
      break;
    }
  }
  if (candidate.z > 0.001) {
    const supported = others.some((p) => {
      const topZ = p.z + p.heightMm;
      if (Math.abs(topZ - candidate.z) > 0.5) return false;
      return (
        candidate.x < p.x + p.lengthMm && candidate.x + candidate.lengthMm > p.x &&
        candidate.y < p.y + p.widthMm && candidate.y + candidate.widthMm > p.y
      );
    });
    if (!supported) {
      issues.push({
        severity: "warning",
        code: "UNSTABLE",
        message: "Package is floating — nothing supports it beneath.",
        placementId: candidate.instanceId,
      });
    }
    const cargo = cargoById?.get(candidate.cargoId);
    if (cargo && !cargo.stackable) {
      issues.push({
        severity: "error",
        code: "STACK_LIMIT",
        message: "Cargo marked non-stackable cannot sit above the floor.",
        placementId: candidate.instanceId,
      });
    }
  }
  return issues;
}

export function validatePlan(
  placements: Placement[],
  truck: Truck,
  cargoById?: Map<string, CargoItem>
): PlacementIssue[] {
  const all: PlacementIssue[] = [];
  for (const p of placements) {
    all.push(...validatePlacement(p, placements, truck, cargoById));
  }
  const total = placements.reduce((s, p) => s + p.weightKg, 0);
  if (total > truck.maxPayloadKg) {
    all.push({
      severity: "error",
      code: "WEIGHT_EXCEEDED",
      message: `Total weight ${total}kg exceeds truck payload ${truck.maxPayloadKg}kg.`,
    });
  }
  return all;
}
