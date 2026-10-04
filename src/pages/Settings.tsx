import { useStore } from "@/store/store";
import PageHeader from "@/components/PageHeader";

export default function Settings() {
  const { resetDemo, currentPlan } = useStore();

  const exportPlanJson = () => {
    if (!currentPlan) { alert("No plan to export."); return; }
    const text = JSON.stringify(currentPlan, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loading-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPlacementsCsv = () => {
    if (!currentPlan) { alert("No plan to export."); return; }
    const headers = ["sequence","sku","name","x","y","z","length","width","height","rotation","weight_kg","stack_level"];
    const rows = currentPlan.placements.map((p) => [p.sequence,p.sku,p.name,p.x,p.y,p.z,p.lengthMm,p.widthMm,p.heightMm,p.rotation,p.weightKg,p.stackLevel].join(","));
    const text = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "placements.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <PageHeader title="Settings" subtitle="Local demo build — data lives in browser localStorage." />
      <div className="card space-y-3 max-w-xl">
        <div>
          <div className="label mb-1">Export</div>
          <div className="flex gap-2">
            <button className="btn" onClick={exportPlanJson}>Loading plan JSON</button>
            <button className="btn" onClick={exportPlacementsCsv}>Placements CSV</button>
            <button className="btn" onClick={() => window.print()}>Print PDF (via browser)</button>
          </div>
          <div className="text-xs text-muted mt-2">The browser's "Print → Save as PDF" produces a printable loading plan including the 3D screenshot and tables visible on screen.</div>
        </div>
        <div className="border-t border-line pt-3">
          <div className="label mb-1">Danger zone</div>
          <button className="btn btn-danger" onClick={() => { if (confirm("Reset to demo data? All local changes will be lost.")) resetDemo(); }}>Reset to demo data</button>
        </div>
      </div>
    </div>
  );
}
