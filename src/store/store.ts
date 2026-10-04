import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CargoItem,
  LoadingPlan,
  LoadingStrategy,
  Placement,
  Shipment,
  Truck,
} from "@/engine/types";
import { generatePlan } from "@/engine/packer";
import { demoTrucks, demoCargo } from "./demoData";

interface StoreState {
  trucks: Truck[];
  cargo: CargoItem[];
  shipments: Shipment[];
  selectedTruckId: string | null;
  currentPlan: LoadingPlan | null;
  strategy: LoadingStrategy;
  // mutators
  addTruck: (t: Truck) => void;
  updateTruck: (id: string, patch: Partial<Truck>) => void;
  removeTruck: (id: string) => void;
  duplicateTruck: (id: string) => void;
  setSelectedTruck: (id: string) => void;
  addCargo: (c: CargoItem) => void;
  updateCargo: (id: string, patch: Partial<CargoItem>) => void;
  removeCargo: (id: string) => void;
  duplicateCargo: (id: string) => void;
  setCargo: (c: CargoItem[]) => void;
  setStrategy: (s: LoadingStrategy) => void;
  regeneratePlan: () => void;
  updatePlacement: (instanceId: string, patch: Partial<Placement>) => void;
  resetDemo: () => void;
  saveShipment: (shipment: Shipment) => void;
  removeShipment: (id: string) => void;
}

function id(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      trucks: demoTrucks(),
      cargo: demoCargo(),
      shipments: [],
      selectedTruckId: null,
      currentPlan: null,
      strategy: "BALANCED",

      addTruck: (t) => set((s) => ({ trucks: [...s.trucks, t] })),
      updateTruck: (idv, patch) =>
        set((s) => ({ trucks: s.trucks.map((t) => (t.id === idv ? { ...t, ...patch } : t)) })),
      removeTruck: (idv) =>
        set((s) => ({
          trucks: s.trucks.filter((t) => t.id !== idv),
          selectedTruckId: s.selectedTruckId === idv ? null : s.selectedTruckId,
        })),
      duplicateTruck: (idv) =>
        set((s) => {
          const src = s.trucks.find((t) => t.id === idv);
          if (!src) return {};
          return { trucks: [...s.trucks, { ...src, id: id(), name: src.name + " (copy)" }] };
        }),
      setSelectedTruck: (idv) => set({ selectedTruckId: idv, currentPlan: null }),

      addCargo: (c) => set((s) => ({ cargo: [...s.cargo, c] })),
      updateCargo: (idv, patch) =>
        set((s) => ({ cargo: s.cargo.map((c) => (c.id === idv ? { ...c, ...patch } : c)) })),
      removeCargo: (idv) => set((s) => ({ cargo: s.cargo.filter((c) => c.id !== idv) })),
      duplicateCargo: (idv) =>
        set((s) => {
          const src = s.cargo.find((c) => c.id === idv);
          if (!src) return {};
          return { cargo: [...s.cargo, { ...src, id: id(), sku: src.sku + "-COPY" }] };
        }),
      setCargo: (c) => set({ cargo: c }),
      setStrategy: (strat) => set({ strategy: strat }),

      regeneratePlan: () => {
        const s = get();
        const truck = s.trucks.find((t) => t.id === s.selectedTruckId) ?? s.trucks[0];
        if (!truck) return;
        const plan = generatePlan(truck, s.cargo, { strategy: s.strategy });
        set({ currentPlan: plan, selectedTruckId: truck.id });
      },

      updatePlacement: (instanceId, patch) =>
        set((s) => {
          if (!s.currentPlan) return {};
          const placements = s.currentPlan.placements.map((p) =>
            p.instanceId === instanceId ? { ...p, ...patch, manual: true } : p
          );
          const totalWeight = placements.reduce((sum, p) => sum + p.weightKg, 0);
          const truck = s.trucks.find((t) => t.id === s.currentPlan!.truckId);
          const truckVolume = truck ? truck.lengthMm * truck.widthMm * truck.heightMm : 0;
          const usedVolume = placements.reduce(
            (sum, p) => sum + p.lengthMm * p.widthMm * p.heightMm,
            0
          );
          return {
            currentPlan: {
              ...s.currentPlan,
              placements,
              summary: {
                ...s.currentPlan.summary,
                totalWeightKg: Math.round(totalWeight * 100) / 100,
                remainingPayloadKg:
                  Math.round((s.currentPlan.summary.maxPayloadKg - totalWeight) * 100) / 100,
                usedVolumeMm3: usedVolume,
                remainingVolumeMm3: truckVolume - usedVolume,
                volumeUtilization: truckVolume > 0 ? usedVolume / truckVolume : 0,
                weightUtilization:
                  s.currentPlan.summary.maxPayloadKg > 0
                    ? totalWeight / s.currentPlan.summary.maxPayloadKg
                    : 0,
              },
            },
          };
        }),

      resetDemo: () =>
        set({
          trucks: demoTrucks(),
          cargo: demoCargo(),
          shipments: [],
          currentPlan: null,
          selectedTruckId: null,
        }),

      saveShipment: (shipment) =>
        set((s) => {
          const idx = s.shipments.findIndex((x) => x.id === shipment.id);
          if (idx >= 0) {
            const next = [...s.shipments];
            next[idx] = { ...shipment, updatedAt: new Date().toISOString() };
            return { shipments: next };
          }
          return { shipments: [...s.shipments, shipment] };
        }),
      removeShipment: (idv) =>
        set((s) => ({ shipments: s.shipments.filter((x) => x.id !== idv) })),
    }),
    { name: "cargo-planner-v1" }
  )
);
