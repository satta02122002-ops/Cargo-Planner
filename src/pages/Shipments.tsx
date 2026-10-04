import { useState } from "react";
import { useStore } from "@/store/store";
import PageHeader from "@/components/PageHeader";
import type { Shipment } from "@/engine/types";

export default function Shipments() {
  const { shipments, trucks, cargo, currentPlan, saveShipment, removeShipment, setCargo, setSelectedTruck, regeneratePlan } = useStore();
  const [filter, setFilter] = useState("");

  const save = () => {
    if (!currentPlan) { alert("Generate a plan first in Loading Planner."); return; }
    const number = prompt("Shipment number", "SHP-" + Math.floor(Math.random() * 90000 + 10000));
    if (!number) return;
    const now = new Date().toISOString();
    const shipment: Shipment = {
      id: crypto.randomUUID(),
      shipmentNumber: number,
      date: now,
      truckId: currentPlan.truckId,
      cargoIds: cargo.map((c) => c.id),
      cargo,
      plan: currentPlan,
      status: "PLANNING",
      createdAt: now,
      updatedAt: now,
    };
    saveShipment(shipment);
  };

  const open = (s: Shipment) => {
    setCargo(s.cargo);
    setSelectedTruck(s.truckId);
    regeneratePlan();
  };

  const filtered = shipments.filter((s) =>
    !filter ||
    s.shipmentNumber.toLowerCase().includes(filter.toLowerCase()) ||
    (s.customer ?? "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Shipments & History"
        subtitle="Save and reopen complete shipments (truck + cargo + plan)."
        actions={<button className="btn btn-primary" onClick={save}>Save current plan</button>}
      />
      <div className="card">
        <input className="input mb-3" placeholder="Search by number or customer…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {filtered.length === 0 ? (
          <div className="text-sm text-muted">No shipments saved yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Number</th><th>Date</th><th>Truck</th><th>Status</th><th>Loaded</th><th>Not Loaded</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{s.shipmentNumber}</td>
                  <td>{new Date(s.date).toLocaleString()}</td>
                  <td>{trucks.find((t) => t.id === s.truckId)?.name ?? "—"}</td>
                  <td>{s.status}</td>
                  <td>{s.plan?.summary.loadedCount ?? "—"}</td>
                  <td>{s.plan?.summary.unloadedCount ?? "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn text-xs" onClick={() => open(s)}>Open</button>
                      <button className="btn btn-danger text-xs" onClick={() => removeShipment(s.id)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
