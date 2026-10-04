import type { CargoItem, Truck } from "@/engine/types";

export function demoTrucks(): Truck[] {
  return [
    {
      id: "truck-3t",
      name: "3 Ton Truck",
      type: "3 Ton Truck",
      registration: "DXB-3TON-01",
      description: "Standard flat-bed curtain-sided 3-ton distribution truck",
      maxPayloadKg: 3000,
      lengthMm: 4500,
      widthMm: 2200,
      heightMm: 2200,
      doorWidthMm: 2100,
      doorHeightMm: 2100,
      axles: 2,
      notes: "JAFZA fleet",
      restrictions: [
        {
          id: "r-wheel-l",
          label: "Left wheel arch",
          x: 1500,
          y: 0,
          z: 0,
          lengthMm: 700,
          widthMm: 300,
          heightMm: 400,
        },
        {
          id: "r-wheel-r",
          label: "Right wheel arch",
          x: 1500,
          y: 1900,
          z: 0,
          lengthMm: 700,
          widthMm: 300,
          heightMm: 400,
        },
      ],
    },
    {
      id: "truck-40ft",
      name: "40 ft Container",
      type: "40 ft Container",
      maxPayloadKg: 26500,
      lengthMm: 12032,
      widthMm: 2352,
      heightMm: 2393,
      doorWidthMm: 2340,
      doorHeightMm: 2280,
      restrictions: [],
    },
    {
      id: "truck-20ft",
      name: "20 ft Container",
      type: "20 ft Container",
      maxPayloadKg: 21700,
      lengthMm: 5898,
      widthMm: 2352,
      heightMm: 2393,
      doorWidthMm: 2340,
      doorHeightMm: 2280,
      restrictions: [],
    },
  ];
}

export function demoCargo(): CargoItem[] {
  return [
    { id: "c1", sku: "ABC-001", name: "Machine Part A", quantity: 4, lengthMm: 1000, widthMm: 500, heightMm: 600, unitWeightKg: 80, stackable: true, maxStack: 2, rotatable: true, keepUpright: false, fragile: false, priority: 2 },
    { id: "c2", sku: "ABC-002", name: "Pump Housing", quantity: 3, lengthMm: 1200, widthMm: 800, heightMm: 500, unitWeightKg: 120, stackable: true, maxStack: 2, rotatable: true, keepUpright: true, fragile: false, priority: 3 },
    { id: "c3", sku: "ABC-003", name: "Fastener Box", quantity: 20, lengthMm: 500, widthMm: 400, heightMm: 300, unitWeightKg: 30, stackable: true, maxStack: 4, rotatable: true, keepUpright: false, fragile: false, priority: 5 },
    { id: "c4", sku: "ABC-004", name: "Control Panel", quantity: 2, lengthMm: 900, widthMm: 700, heightMm: 1800, unitWeightKg: 220, stackable: false, maxStack: 1, rotatable: false, keepUpright: true, fragile: true, priority: 1 },
    { id: "c5", sku: "ABC-005", name: "Steel Beam", quantity: 2, lengthMm: 2800, widthMm: 300, heightMm: 300, unitWeightKg: 180, stackable: true, maxStack: 3, rotatable: true, keepUpright: false, fragile: false, priority: 4 },
    { id: "c6", sku: "ABC-006", name: "Insulation Roll", quantity: 6, lengthMm: 1500, widthMm: 600, heightMm: 600, unitWeightKg: 40, stackable: true, maxStack: 3, rotatable: true, keepUpright: false, fragile: false, priority: 6 },
    { id: "c7", sku: "ABC-007", name: "Spare Tire", quantity: 4, lengthMm: 800, widthMm: 800, heightMm: 300, unitWeightKg: 25, stackable: true, maxStack: 4, rotatable: true, keepUpright: false, fragile: false, priority: 7 },
    { id: "c8", sku: "ABC-008", name: "Glass Panel", quantity: 2, lengthMm: 2000, widthMm: 100, heightMm: 1200, unitWeightKg: 90, stackable: false, maxStack: 1, rotatable: false, keepUpright: true, fragile: true, priority: 1 },
    { id: "c9", sku: "ABC-009", name: "Toolbox", quantity: 8, lengthMm: 600, widthMm: 400, heightMm: 400, unitWeightKg: 45, stackable: true, maxStack: 3, rotatable: true, keepUpright: false, fragile: false, priority: 5 },
    { id: "c10", sku: "ABC-010", name: "Barrel", quantity: 4, lengthMm: 600, widthMm: 600, heightMm: 900, unitWeightKg: 150, stackable: false, maxStack: 1, rotatable: false, keepUpright: true, fragile: false, priority: 3 },
  ];
}
