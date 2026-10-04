// All dimensions in millimeters, weights in kilograms. Coordinates:
//   X = truck length (depth into truck), Y = truck width, Z = truck height.

export interface Truck {
  id: string;
  name: string;
  type: string;
  registration?: string;
  description?: string;
  maxPayloadKg: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  doorWidthMm: number;
  doorHeightMm: number;
  axles?: number;
  notes?: string;
  restrictions: RestrictedZone[];
}

export interface RestrictedZone {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

export type Orientation =
  | "LWH"
  | "LHW"
  | "WLH"
  | "WHL"
  | "HLW"
  | "HWL";

export interface CargoItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  unitWeightKg: number;
  stackable: boolean;
  maxStack: number;
  rotatable: boolean;
  keepUpright: boolean;
  fragile: boolean;
  priority: number; // 1 = highest
  notes?: string;
  // Visual color seed (hex). If omitted a hash of sku is used.
  color?: string;
}

export interface Placement {
  instanceId: string;
  cargoId: string;
  sku: string;
  name: string;
  sequence: number;
  x: number;
  y: number;
  z: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  rotation: Orientation;
  weightKg: number;
  stackLevel: number;
  color: string;
  manual?: boolean;
}

export interface UnloadedItem {
  cargoId: string;
  sku: string;
  name: string;
  quantity: number;
  reason: string;
}

export interface LoadingPlan {
  id: string;
  truckId: string;
  strategy: LoadingStrategy;
  placements: Placement[];
  unloaded: UnloadedItem[];
  summary: PlanSummary;
  warnings: string[];
  createdAt: string;
}

export interface PlanSummary {
  totalItems: number;
  loadedCount: number;
  unloadedCount: number;
  totalWeightKg: number;
  maxPayloadKg: number;
  remainingPayloadKg: number;
  truckVolumeMm3: number;
  usedVolumeMm3: number;
  remainingVolumeMm3: number;
  volumeUtilization: number; // 0..1
  weightUtilization: number; // 0..1
  status: LoadingStatus;
  weightDistribution: WeightDistribution;
}

export type LoadingStatus =
  | "LOADED"
  | "PARTIALLY_LOADED"
  | "CANNOT_LOAD"
  | "WEIGHT_EXCEEDED"
  | "DIMENSION_EXCEEDED"
  | "LOADING_COMPLETE";

export interface WeightDistribution {
  front: number;
  rear: number;
  left: number;
  right: number;
  cogX: number;
  cogY: number;
  cogZ: number;
  balanced: boolean;
}

export type LoadingStrategy =
  | "MAX_QUANTITY"
  | "MAX_WEIGHT_EFFICIENCY"
  | "PRIORITY_FIRST"
  | "BALANCED";

export interface Shipment {
  id: string;
  shipmentNumber: string;
  customer?: string;
  date: string;
  truckId: string;
  driver?: string;
  destination?: string;
  cargoIds: string[]; // references cargo items
  cargo: CargoItem[]; // snapshot
  plan?: LoadingPlan;
  notes?: string;
  status: "DRAFT" | "PLANNING" | "READY_FOR_LOADING" | "LOADED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
}
