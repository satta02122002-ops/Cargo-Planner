import { useStore } from "@/store/store";
import PageHeader from "@/components/PageHeader";
import StatTile from "@/components/StatTile";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { trucks, cargo, currentPlan, selectedTruckId, regeneratePlan } = useStore();
  const truck = trucks.find((t) => t.id === (selectedTruckId ?? currentPlan?.truckId)) ?? trucks[0];
  const totalPackages = cargo.reduce((s, c) => s + c.quantity, 0);
  const summary = currentPlan?.summary;

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard"
        subtitle={truck ? `${truck.name} · ${truck.lengthMm}×${truck.widthMm}×${truck.heightMm} mm · ${truck.maxPayloadKg} kg` : "No truck selected"}
        actions={
          <>
            <Link to="/planner" className="btn">Open Planner</Link>
            <button className="btn btn-primary" onClick={regeneratePlan}>Generate Plan</button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total Packages" value={totalPackages} sub={`${cargo.length} SKUs`} />
        <StatTile
          label="Loaded"
          value={summary?.loadedCount ?? "—"}
          tone="ok"
          sub={summary ? `${summary.unloadedCount} not loaded` : "No plan yet"}
        />
        <StatTile
          label="Total Weight"
          value={summary ? `${summary.totalWeightKg} kg` : "—"}
          sub={summary ? `${(summary.weightUtilization * 100).toFixed(0)}% utilization` : undefined}
          tone={summary && summary.weightUtilization > 1 ? "err" : undefined}
        />
        <StatTile
          label="Volume Utilization"
          value={summary ? `${(summary.volumeUtilization * 100).toFixed(0)}%` : "—"}
          sub={summary ? `${Math.round(summary.remainingVolumeMm3 / 1e6)} L free` : undefined}
        />
        <StatTile label="Max Payload" value={truck ? `${truck.maxPayloadKg} kg` : "—"} />
        <StatTile
          label="Remaining Payload"
          value={summary ? `${summary.remainingPayloadKg} kg` : "—"}
          tone={summary && summary.remainingPayloadKg < 0 ? "err" : undefined}
        />
        <StatTile
          label="Truck Volume"
          value={truck ? `${Math.round((truck.lengthMm * truck.widthMm * truck.heightMm) / 1e6)} L` : "—"}
        />
        <StatTile
          label="Status"
          value={summary ? <StatusBadge status={summary.status} /> : "—"}
        />
      </div>

      {summary && (
        <div className="card">
          <div className="label mb-2">Weight distribution</div>
          <div className="grid grid-cols-5 gap-3 text-sm">
            <div><span className="text-muted">Front</span><div className="font-medium">{summary.weightDistribution.front} kg</div></div>
            <div><span className="text-muted">Rear</span><div className="font-medium">{summary.weightDistribution.rear} kg</div></div>
            <div><span className="text-muted">Left</span><div className="font-medium">{summary.weightDistribution.left} kg</div></div>
            <div><span className="text-muted">Right</span><div className="font-medium">{summary.weightDistribution.right} kg</div></div>
            <div>
              <span className="text-muted">COG</span>
              <div className="font-medium">
                X {summary.weightDistribution.cogX} / Y {summary.weightDistribution.cogY} / Z {summary.weightDistribution.cogZ}
              </div>
            </div>
          </div>
          {!summary.weightDistribution.balanced && (
            <div className="mt-2 text-xs text-warn">⚠ Weight is unevenly distributed between front/rear or left/right axes.</div>
          )}
        </div>
      )}

      {!summary && (
        <div className="card text-sm text-muted">
          No loading plan has been generated yet. Head to <Link to="/planner" className="text-accent">Loading Planner</Link> to configure the shipment, or click <strong>Generate Plan</strong> above to run against the current cargo and the default truck.
        </div>
      )}
    </div>
  );
}
