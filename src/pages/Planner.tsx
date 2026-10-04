import { useMemo, useState } from "react";
import { useStore } from "@/store/store";
import PageHeader from "@/components/PageHeader";
import StatTile from "@/components/StatTile";
import StatusBadge from "@/components/StatusBadge";
import type { LoadingStrategy, Placement } from "@/engine/types";
import { generatePlan } from "@/engine/packer";
import { validatePlan } from "@/engine/validation";
import { Link } from "react-router-dom";

const strategies: { v: LoadingStrategy; label: string; desc: string }[] = [
  { v: "MAX_QUANTITY", label: "Plan A — Max Quantity", desc: "Fit the most pieces by placing smaller items first" },
  { v: "MAX_WEIGHT_EFFICIENCY", label: "Plan B — Weight Efficiency", desc: "Heavier/denser items first, uses payload faster" },
  { v: "PRIORITY_FIRST", label: "Plan C — Priority First", desc: "Honor priority 1 items first" },
  { v: "BALANCED", label: "Plan D — Balanced", desc: "Non-stackable floor-first, heavy on bottom" },
];

export default function Planner() {
  const { trucks, cargo, currentPlan, selectedTruckId, strategy, setStrategy, setSelectedTruck, regeneratePlan } = useStore();
  const [comparing, setComparing] = useState(false);

  const truck = trucks.find((t) => t.id === (selectedTruckId ?? currentPlan?.truckId)) ?? trucks[0];

  const compared = useMemo(() => {
    if (!comparing || !truck) return [];
    return strategies.map((s) => ({ s, plan: generatePlan(truck, cargo, { strategy: s.v }) }));
  }, [comparing, truck, cargo]);

  const issues = useMemo(() => {
    if (!currentPlan || !truck) return [];
    const cmap = new Map(cargo.map((c) => [c.id, c]));
    return validatePlan(currentPlan.placements, truck, cmap);
  }, [currentPlan, truck, cargo]);

  return (
    <div className="p-6">
      <PageHeader
        title="Loading Planner"
        subtitle="Pick a truck, pick a strategy, generate the loading plan."
        actions={
          <>
            <button className="btn" onClick={() => setComparing((v) => !v)}>
              {comparing ? "Hide" : "Compare"} alternatives
            </button>
            <button className="btn btn-primary" onClick={regeneratePlan}>Generate Loading Plan</button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="label mb-2">1. Truck</div>
          <select className="input" value={truck?.id ?? ""} onChange={(e) => setSelectedTruck(e.target.value)}>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.maxPayloadKg} kg</option>
            ))}
          </select>
          {truck && (
            <div className="text-xs text-muted mt-2">
              {truck.lengthMm}×{truck.widthMm}×{truck.heightMm} mm · door {truck.doorWidthMm}×{truck.doorHeightMm} mm · {truck.restrictions.length} restricted zones
            </div>
          )}
        </div>
        <div className="card">
          <div className="label mb-2">2. Cargo</div>
          <div className="text-sm">{cargo.length} SKUs · {cargo.reduce((s, c) => s + c.quantity, 0)} packages</div>
          <Link to="/cargo" className="btn mt-2 inline-flex">Edit cargo</Link>
        </div>
        <div className="card">
          <div className="label mb-2">3. Strategy</div>
          <select className="input" value={strategy} onChange={(e) => setStrategy(e.target.value as LoadingStrategy)}>
            {strategies.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <div className="text-xs text-muted mt-2">{strategies.find((s) => s.v === strategy)?.desc}</div>
        </div>
      </div>

      {comparing && (
        <div className="card mb-6 overflow-auto">
          <div className="label mb-2">Strategy comparison</div>
          <table className="table">
            <thead>
              <tr><th>Plan</th><th>Loaded</th><th>Not Loaded</th><th>Weight</th><th>Vol %</th><th>Wt %</th><th>Balanced</th><th></th></tr>
            </thead>
            <tbody>
              {compared.map(({ s, plan }) => (
                <tr key={s.v}>
                  <td>{s.label}</td>
                  <td>{plan.summary.loadedCount}</td>
                  <td>{plan.summary.unloadedCount}</td>
                  <td>{plan.summary.totalWeightKg} kg</td>
                  <td>{(plan.summary.volumeUtilization * 100).toFixed(0)}%</td>
                  <td>{(plan.summary.weightUtilization * 100).toFixed(0)}%</td>
                  <td>{plan.summary.weightDistribution.balanced ? "yes" : "no"}</td>
                  <td>
                    <button className="btn text-xs" onClick={() => { setStrategy(s.v); regeneratePlan(); }}>Use this</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {currentPlan && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatTile label="Loaded" value={currentPlan.summary.loadedCount} tone="ok" sub={`${currentPlan.summary.unloadedCount} not loaded`} />
            <StatTile label="Total Weight" value={`${currentPlan.summary.totalWeightKg} kg`} sub={`of ${currentPlan.summary.maxPayloadKg} kg`} tone={currentPlan.summary.remainingPayloadKg < 0 ? "err" : undefined} />
            <StatTile label="Volume" value={`${(currentPlan.summary.volumeUtilization * 100).toFixed(0)}%`} sub={`${Math.round(currentPlan.summary.remainingVolumeMm3 / 1e6)} L free`} />
            <StatTile label="Status" value={<StatusBadge status={currentPlan.summary.status} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="card lg:col-span-2">
              <div className="label mb-2">Loading plan ({currentPlan.placements.length})</div>
              <PlacementsTable placements={currentPlan.placements} />
              <div className="text-right mt-2">
                <Link to="/view" className="btn btn-primary">Open 3D View →</Link>
              </div>
            </div>
            <div className="card">
              <div className="label mb-2">Not loaded ({currentPlan.unloaded.reduce((s, u) => s + u.quantity, 0)})</div>
              {currentPlan.unloaded.length === 0 ? (
                <div className="text-sm text-ok">All packages loaded successfully.</div>
              ) : (
                <ul className="text-sm space-y-2">
                  {currentPlan.unloaded.map((u) => (
                    <li key={u.cargoId} className="border-b border-line/50 pb-1">
                      <div><strong>{u.sku}</strong> — {u.quantity} unit(s)</div>
                      <div className="text-xs text-muted">Reason: {u.reason}</div>
                    </li>
                  ))}
                </ul>
              )}
              {issues.length > 0 && (
                <div className="mt-4">
                  <div className="label mb-1">Validation</div>
                  <ul className="text-xs space-y-1">
                    {issues.map((i, idx) => (
                      <li key={idx} className={i.severity === "error" ? "text-err" : "text-warn"}>
                        {i.severity.toUpperCase()}: {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PlacementsTable({ placements }: { placements: Placement[] }) {
  return (
    <div className="overflow-auto max-h-[420px]">
      <table className="table">
        <thead className="sticky top-0 bg-panel">
          <tr>
            <th>Seq</th><th>SKU</th><th>Product</th>
            <th>X</th><th>Y</th><th>Z</th>
            <th>Rot</th><th>L</th><th>W</th><th>H</th>
            <th>kg</th><th>Lvl</th>
          </tr>
        </thead>
        <tbody>
          {placements.map((p) => (
            <tr key={p.instanceId}>
              <td>{p.sequence}</td>
              <td><span className="inline-block w-3 h-3 rounded-sm mr-1 align-middle" style={{ backgroundColor: p.color }} />{p.sku}</td>
              <td>{p.name}</td>
              <td>{p.x}</td><td>{p.y}</td><td>{p.z}</td>
              <td>{p.rotation}</td>
              <td>{p.lengthMm}</td><td>{p.widthMm}</td><td>{p.heightMm}</td>
              <td>{p.weightKg}</td><td>{p.stackLevel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
