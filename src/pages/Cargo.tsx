import { useRef, useState } from "react";
import { useStore } from "@/store/store";
import PageHeader from "@/components/PageHeader";
import type { CargoItem } from "@/engine/types";

function blank(): CargoItem {
  return {
    id: crypto.randomUUID(),
    sku: "SKU-" + Math.floor(Math.random() * 9000 + 1000),
    name: "New Item",
    quantity: 1,
    lengthMm: 500, widthMm: 500, heightMm: 500,
    unitWeightKg: 10,
    stackable: true, maxStack: 3,
    rotatable: true, keepUpright: false, fragile: false,
    priority: 5,
  };
}

export default function Cargo() {
  const { cargo, addCargo, updateCargo, removeCargo, duplicateCargo, setCargo } = useStore();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportCsv = () => {
    const headers = ["sku","name","quantity","length_mm","width_mm","height_mm","unit_weight_kg","stackable","max_stack","rotatable","keep_upright","fragile","priority"];
    const rows = cargo.map((c) => [c.sku,c.name,c.quantity,c.lengthMm,c.widthMm,c.heightMm,c.unitWeightKg,c.stackable,c.maxStack,c.rotatable,c.keepUpright,c.fragile,c.priority].join(","));
    const text = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cargo.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parsePaste = (text: string): CargoItem[] | string => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return "No rows to import";
    const sep = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
    const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
    const dataLines = /sku|product|name|qty/i.test(header.join("")) ? lines.slice(1) : lines;
    const out: CargoItem[] = [];
    for (const line of dataLines) {
      const cols = line.split(sep).map((s) => s.trim());
      if (cols.length < 7) return `Row needs at least 7 columns: ${line}`;
      const [sku, name, qty, L, W, H, wt, stackable, maxStack] = cols;
      const q = Number(qty), l = Number(L), w = Number(W), h = Number(H), uw = Number(wt);
      if ([q, l, w, h, uw].some((n) => !Number.isFinite(n) || n <= 0)) return `Invalid numeric fields: ${line}`;
      out.push({
        ...blank(),
        id: crypto.randomUUID(),
        sku, name, quantity: q,
        lengthMm: l, widthMm: w, heightMm: h,
        unitWeightKg: uw,
        stackable: stackable ? /^(1|y|yes|true)$/i.test(stackable) : true,
        maxStack: maxStack ? Number(maxStack) || 3 : 3,
      });
    }
    return out;
  };

  const doPaste = () => {
    const result = parsePaste(pasteText);
    if (typeof result === "string") { setPasteError(result); return; }
    setCargo([...cargo, ...result]);
    setPasteOpen(false);
    setPasteText("");
    setPasteError(null);
  };

  const importFile = async (f: File) => {
    const text = await f.text();
    const result = parsePaste(text);
    if (typeof result === "string") { alert(result); return; }
    setCargo([...cargo, ...result]);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Cargo"
        subtitle={`${cargo.length} SKUs · ${cargo.reduce((s, c) => s + c.quantity, 0)} packages`}
        actions={
          <>
            <input type="file" accept=".csv,.tsv,.txt" className="hidden" ref={fileRef} onChange={(e) => e.target.files && importFile(e.target.files[0])} />
            <button className="btn" onClick={() => fileRef.current?.click()}>Import CSV</button>
            <button className="btn" onClick={() => setPasteOpen(true)}>Bulk Paste</button>
            <button className="btn" onClick={exportCsv}>Export CSV</button>
            <button className="btn btn-primary" onClick={() => addCargo(blank())}>+ Row</button>
          </>
        }
      />

      {pasteOpen && (
        <div className="card mb-4">
          <div className="label mb-1">Paste rows (tab/pipe/comma separated)</div>
          <textarea
            className="input h-40 font-mono"
            placeholder={"SKU | Product | Qty | Length | Width | Height | Weight | Stackable | MaxStack\nABC001 | Product A | 10 | 1000 | 500 | 600 | 80 | yes | 2"}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          {pasteError && <div className="text-err text-xs mt-1">{pasteError}</div>}
          <div className="flex gap-2 mt-2">
            <button className="btn btn-primary" onClick={doPaste}>Import</button>
            <button className="btn" onClick={() => { setPasteOpen(false); setPasteError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-auto">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th><th>Product</th><th>Qty</th>
              <th>L (mm)</th><th>W (mm)</th><th>H (mm)</th>
              <th>Weight (kg)</th><th>Stackable</th><th>Max Stack</th>
              <th>Rotatable</th><th>Upright</th><th>Fragile</th><th>Priority</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargo.map((c) => (
              <tr key={c.id}>
                <Cell c={c} k="sku" />
                <Cell c={c} k="name" wide />
                <NumCell c={c} k="quantity" />
                <NumCell c={c} k="lengthMm" />
                <NumCell c={c} k="widthMm" />
                <NumCell c={c} k="heightMm" />
                <NumCell c={c} k="unitWeightKg" />
                <BoolCell c={c} k="stackable" />
                <NumCell c={c} k="maxStack" />
                <BoolCell c={c} k="rotatable" />
                <BoolCell c={c} k="keepUpright" />
                <BoolCell c={c} k="fragile" />
                <NumCell c={c} k="priority" />
                <td>
                  <div className="flex gap-1">
                    <button className="btn text-xs" onClick={() => duplicateCargo(c.id)}>Dup</button>
                    <button className="btn btn-danger text-xs" onClick={() => removeCargo(c.id)}>×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ c, k, wide }: { c: CargoItem; k: keyof CargoItem; wide?: boolean }) {
  const update = useStore((s) => s.updateCargo);
  return (
    <td style={wide ? { minWidth: 180 } : undefined}>
      <input className="input" value={String(c[k] ?? "")} onChange={(e) => update(c.id, { [k]: e.target.value } as any)} />
    </td>
  );
}
function NumCell({ c, k }: { c: CargoItem; k: keyof CargoItem }) {
  const update = useStore((s) => s.updateCargo);
  return (
    <td style={{ width: 90 }}>
      <input className="input" type="number" value={Number(c[k] ?? 0)} onChange={(e) => update(c.id, { [k]: Number(e.target.value) } as any)} />
    </td>
  );
}
function BoolCell({ c, k }: { c: CargoItem; k: keyof CargoItem }) {
  const update = useStore((s) => s.updateCargo);
  return (
    <td>
      <input type="checkbox" checked={Boolean(c[k])} onChange={(e) => update(c.id, { [k]: e.target.checked } as any)} />
    </td>
  );
}
