import { describe, it, expect } from "vitest";
import { generatePlan } from "./packer";
import { validatePlan } from "./validation";
import type { CargoItem, Truck } from "./types";

function truck(partial: Partial<Truck> = {}): Truck {
  return {
    id: "t1",
    name: "Test",
    type: "3 Ton",
    maxPayloadKg: 3000,
    lengthMm: 4500,
    widthMm: 2200,
    heightMm: 2200,
    doorWidthMm: 2100,
    doorHeightMm: 2100,
    restrictions: [],
    ...partial,
  };
}

function cargo(partial: Partial<CargoItem>): CargoItem {
  return {
    id: partial.id ?? "c-" + Math.random().toString(36).slice(2),
    sku: partial.sku ?? "SKU",
    name: partial.name ?? "Item",
    quantity: 1,
    lengthMm: 1000, widthMm: 500, heightMm: 500,
    unitWeightKg: 10,
    stackable: true, maxStack: 10,
    rotatable: true, keepUpright: false,
    fragile: false, priority: 5,
    ...partial,
  };
}

describe("packer", () => {
  it("places a single fitting package", () => {
    const plan = generatePlan(truck(), [cargo({ sku: "A", quantity: 1 })], { strategy: "MAX_QUANTITY" });
    expect(plan.placements).toHaveLength(1);
    expect(plan.unloaded).toHaveLength(0);
  });

  it("rejects a package larger than the truck", () => {
    const plan = generatePlan(truck(), [
      cargo({ sku: "BIG", quantity: 1, lengthMm: 5000, widthMm: 500, heightMm: 500, rotatable: false }),
    ], { strategy: "MAX_QUANTITY" });
    expect(plan.placements).toHaveLength(0);
    expect(plan.unloaded[0].reason).toMatch(/dimensions/i);
  });

  it("rotates to fit a package that only fits rotated", () => {
    const plan = generatePlan(
      truck({ lengthMm: 1000, widthMm: 4000, heightMm: 2000 }),
      [cargo({ sku: "R", quantity: 1, lengthMm: 3500, widthMm: 900, heightMm: 500 })],
      { strategy: "MAX_QUANTITY" }
    );
    expect(plan.placements).toHaveLength(1);
  });

  it("respects weight limit", () => {
    const plan = generatePlan(
      truck({ maxPayloadKg: 100 }),
      [cargo({ sku: "H", quantity: 5, unitWeightKg: 30, lengthMm: 300, widthMm: 300, heightMm: 300 })],
      { strategy: "MAX_QUANTITY" }
    );
    expect(plan.placements.length).toBe(3);
    expect(plan.unloaded.reduce((s, u) => s + u.quantity, 0)).toBe(2);
  });

  it("places multiple non-colliding packages", () => {
    const plan = generatePlan(
      truck(),
      [cargo({ sku: "M", quantity: 8, lengthMm: 1000, widthMm: 1000, heightMm: 1000, unitWeightKg: 50 })],
      { strategy: "MAX_QUANTITY" }
    );
    expect(plan.placements).toHaveLength(8);
    const issues = validatePlan(plan.placements, truck());
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("stacks when allowed and skips when not", () => {
    const planStack = generatePlan(
      truck({ lengthMm: 1200, widthMm: 1000, heightMm: 2200 }),
      [cargo({ sku: "S", quantity: 3, lengthMm: 1000, widthMm: 800, heightMm: 500, stackable: true, maxStack: 3 })],
      { strategy: "MAX_QUANTITY" }
    );
    expect(planStack.placements).toHaveLength(3);
    const zs = planStack.placements.map((p) => p.z).sort((a, b) => a - b);
    expect(zs[0]).toBe(0);
    expect(zs[2]).toBeGreaterThan(0);

    const planNoStack = generatePlan(
      truck({ lengthMm: 1200, widthMm: 1000, heightMm: 2200 }),
      [cargo({ sku: "NS", quantity: 3, lengthMm: 1000, widthMm: 800, heightMm: 500, stackable: false })],
      { strategy: "MAX_QUANTITY" }
    );
    expect(planNoStack.placements.every((p) => p.z === 0)).toBe(true);
  });

  it("rejects package that cannot enter the door", () => {
    const plan = generatePlan(
      truck({ doorWidthMm: 500, doorHeightMm: 500 }),
      [cargo({ sku: "D", quantity: 1, lengthMm: 800, widthMm: 800, heightMm: 800, rotatable: false })],
      { strategy: "MAX_QUANTITY" }
    );
    expect(plan.placements).toHaveLength(0);
    expect(plan.unloaded[0].reason).toMatch(/door/i);
  });

  it("avoids restricted zones", () => {
    const t = truck({
      restrictions: [{ id: "r1", label: "wheel arch", x: 0, y: 0, z: 0, lengthMm: 500, widthMm: 2200, heightMm: 400 }],
    });
    const plan = generatePlan(
      t,
      [cargo({ sku: "W", quantity: 1, lengthMm: 400, widthMm: 400, heightMm: 300 })],
      { strategy: "MAX_QUANTITY" }
    );
    expect(plan.placements).toHaveLength(1);
    expect(plan.placements[0].x).toBeGreaterThanOrEqual(500);
  });
});
