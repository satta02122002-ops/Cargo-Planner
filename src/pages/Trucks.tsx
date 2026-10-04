import { useState } from "react";
import { useStore } from "@/store/store";
import PageHeader from "@/components/PageHeader";
import type { RestrictedZone, Truck } from "@/engine/types";

function emptyTruck(): Truck {
  return {
    id: crypto.randomUUID(),
    name: "New Truck",
    type: "Custom",
    maxPayloadKg: 3000,
    lengthMm: 4500,
    widthMm: 2200,
    heightMm: 2200,
    doorWidthMm: 2100,
    doorHeightMm: 2100,
    restrictions: [],
  };
}

export default function Trucks() {
  const { trucks, addTruck, updateTruck, removeTruck, duplicateTruck, setSelectedTruck, selectedTruckId } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = trucks.find((t) => t.id === editingId) ?? null;

  return (
    <div className="p-6">
      <PageHeader
        title="Truck Configuration"
        subtitle="Create and manage reusable truck profiles."
        actions={
          <button className="btn btn-primary" onClick={() => {
            const t = emptyTruck();
            addTruck(t);
            setEditingId(t.id);
          }}>+ New Truck</button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <div className="label mb-2">Trucks ({trucks.length})</div>
          <div className="flex flex-col gap-1">
            {trucks.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between p-2 rounded hover:bg-line cursor-pointer ${editingId === t.id ? "bg-line" : ""}`}
                onClick={() => setEditingId(t.id)}
              >
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted">{t.lengthMm}×{t.widthMm}×{t.heightMm} · {t.maxPayloadKg} kg</div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {selectedTruckId === t.id && <span className="badge border-accent/60 text-accent bg-accent/10">Active</span>}
                  <button className="btn text-xs" onClick={() => setSelectedTruck(t.id)}>Use</button>
                  <button className="btn text-xs" onClick={() => duplicateTruck(t.id)}>Dup</button>
                  <button className="btn btn-danger text-xs" onClick={() => { if (confirm("Delete truck?")) removeTruck(t.id); }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          {editing ? (
            <TruckForm truck={editing} onChange={(patch) => updateTruck(editing.id, patch)} />
          ) : (
            <div className="text-sm text-muted">Select a truck to edit, or create a new one.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TruckForm({ truck, onChange }: { truck: Truck; onChange: (patch: Partial<Truck>) => void }) {
  const F = (k: keyof Truck, label: string, type: "text" | "number" = "number") => (
    <div>
      <div className="label">{label}</div>
      <input
        className="input"
        type={type}
        value={(truck[k] as any) ?? ""}
        onChange={(e) => onChange({ [k]: type === "number" ? Number(e.target.value) : e.target.value } as any)}
      />
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {F("name", "Name", "text")}
      {F("type", "Type", "text")}
      {F("registration", "Registration", "text")}
      <div className="md:col-span-3">
        <div className="label">Description</div>
        <input className="input" value={truck.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} />
      </div>
      {F("maxPayloadKg", "Max Payload (kg)")}
      {F("lengthMm", "Internal Length (mm)")}
      {F("widthMm", "Internal Width (mm)")}
      {F("heightMm", "Internal Height (mm)")}
      {F("doorWidthMm", "Door Width (mm)")}
      {F("doorHeightMm", "Door Height (mm)")}
      {F("axles", "Axles")}
      <div className="md:col-span-3">
        <div className="label">Notes</div>
        <input className="input" value={truck.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value })} />
      </div>
      <div className="md:col-span-3">
        <RestrictedZones zones={truck.restrictions} onChange={(zones) => onChange({ restrictions: zones })} />
      </div>
    </div>
  );
}

function RestrictedZones({
  zones,
  onChange,
}: {
  zones: RestrictedZone[];
  onChange: (zones: RestrictedZone[]) => void;
}) {
  const add = () =>
    onChange([
      ...zones,
      { id: crypto.randomUUID(), label: "Obstacle", x: 0, y: 0, z: 0, lengthMm: 500, widthMm: 500, heightMm: 500 },
    ]);
  const upd = (i: number, patch: Partial<RestrictedZone>) =>
    onChange(zones.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));
  const del = (i: number) => onChange(zones.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="label">Restricted zones ({zones.length})</div>
        <button className="btn" onClick={add}>+ Zone</button>
      </div>
      {zones.length === 0 && <div className="text-xs text-muted">No restricted zones. Add wheel arches, refrigeration units, pillars, etc.</div>}
      {zones.map((z, i) => (
        <div key={z.id} className="grid grid-cols-8 gap-2 items-end mb-2">
          <div className="col-span-2">
            <div className="label">Label</div>
            <input className="input" value={z.label} onChange={(e) => upd(i, { label: e.target.value })} />
          </div>
          <input className="input" type="number" value={z.x} onChange={(e) => upd(i, { x: +e.target.value })} placeholder="X" />
          <input className="input" type="number" value={z.y} onChange={(e) => upd(i, { y: +e.target.value })} placeholder="Y" />
          <input className="input" type="number" value={z.z} onChange={(e) => upd(i, { z: +e.target.value })} placeholder="Z" />
          <input className="input" type="number" value={z.lengthMm} onChange={(e) => upd(i, { lengthMm: +e.target.value })} placeholder="L" />
          <input className="input" type="number" value={z.widthMm} onChange={(e) => upd(i, { widthMm: +e.target.value })} placeholder="W" />
          <div className="flex gap-2">
            <input className="input" type="number" value={z.heightMm} onChange={(e) => upd(i, { heightMm: +e.target.value })} placeholder="H" />
            <button className="btn btn-danger" onClick={() => del(i)}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
