import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, GizmoHelper, GizmoViewport, Edges } from "@react-three/drei";
import { useStore } from "@/store/store";
import PageHeader from "@/components/PageHeader";
import type { Placement, Truck } from "@/engine/types";
import { validatePlacement } from "@/engine/validation";

type ViewPreset = "iso" | "front" | "rear" | "left" | "right" | "top";

export default function ThreeView() {
  const { trucks, currentPlan, cargo, regeneratePlan, updatePlacement } = useStore();
  const truck = trucks.find((t) => t.id === currentPlan?.truckId) ?? trucks[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWalls, setShowWalls] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [transparency, setTransparency] = useState(0.85);
  const [view, setView] = useState<ViewPreset>("iso");
  const [mode2d, setMode2d] = useState<"3d" | "top" | "front" | "side">("3d");

  if (!currentPlan || !truck) {
    return (
      <div className="p-6">
        <PageHeader title="3D View" />
        <div className="card text-sm text-muted">
          No plan loaded. <button className="btn ml-2" onClick={regeneratePlan}>Generate a plan</button>
        </div>
      </div>
    );
  }

  const selected = currentPlan.placements.find((p) => p.instanceId === selectedId) ?? null;
  const cargoById = new Map(cargo.map((c) => [c.id, c]));
  const selectedIssues = selected ? validatePlacement(selected, currentPlan.placements, truck, cargoById) : [];

  const nudge = (axis: "x" | "y" | "z", delta: number) => {
    if (!selected) return;
    updatePlacement(selected.instanceId, { [axis]: Math.max(0, selected[axis] + delta) } as any);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="3D View"
        subtitle={`${truck.name} · ${currentPlan.placements.length} packages`}
        actions={
          <>
            <div className="flex gap-1 bg-panel border border-line rounded p-1">
              {(["3d","top","front","side"] as const).map((m) => (
                <button key={m} className={`btn text-xs ${mode2d === m ? "btn-primary" : ""}`} onClick={() => setMode2d(m)}>{m.toUpperCase()}</button>
              ))}
            </div>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card lg:col-span-3 p-0 overflow-hidden" style={{ height: 620 }}>
          {mode2d === "3d" ? (
            <Canvas camera={{ position: cameraForView(view, truck), fov: 35 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 10, 7]} intensity={0.8} />
              <Suspense fallback={null}>
                <SceneRoot
                  truck={truck}
                  placements={currentPlan.placements}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  showWalls={showWalls}
                  showLabels={showLabels}
                  transparency={transparency}
                />
              </Suspense>
              <OrbitControls makeDefault />
              <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
                <GizmoViewport labelColor="white" axisHeadScale={1} />
              </GizmoHelper>
            </Canvas>
          ) : (
            <TwoDView truck={truck} placements={currentPlan.placements} mode={mode2d} selectedId={selectedId} onSelect={setSelectedId} showLabels={showLabels} />
          )}
        </div>

        <div className="card lg:col-span-1 flex flex-col gap-3 overflow-auto" style={{ maxHeight: 620 }}>
          <div>
            <div className="label mb-1">Camera presets</div>
            <div className="grid grid-cols-3 gap-1">
              {(["iso","front","rear","left","right","top"] as ViewPreset[]).map((v) => (
                <button key={v} className={`btn text-xs ${view === v ? "btn-primary" : ""}`} onClick={() => setView(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showWalls} onChange={(e) => setShowWalls(e.target.checked)} /> Show truck walls
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Show labels
            </label>
            <label className="text-sm">Transparency
              <input type="range" min={0.1} max={1} step={0.05} value={transparency} onChange={(e) => setTransparency(+e.target.value)} className="w-full" />
            </label>
          </div>

          {selected ? (
            <div className="border border-line rounded p-2 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: selected.color }} />
                <strong>{selected.sku}</strong>
                <span className="text-xs text-muted">#{selected.sequence}</span>
              </div>
              <div className="text-muted text-xs mb-2">{selected.name}</div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div>X {selected.x}</div><div>Y {selected.y}</div><div>Z {selected.z}</div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs mt-1 text-muted">
                <div>L {selected.lengthMm}</div><div>W {selected.widthMm}</div><div>H {selected.heightMm}</div>
              </div>
              <div className="text-xs mt-1 text-muted">Rot {selected.rotation} · Lvl {selected.stackLevel} · {selected.weightKg} kg</div>

              <div className="label mt-3 mb-1">Nudge position (±10 mm)</div>
              <div className="grid grid-cols-3 gap-1">
                {(["x","y","z"] as const).map((axis) => (
                  <div key={axis} className="flex gap-1">
                    <button className="btn text-xs flex-1" onClick={() => nudge(axis, -10)}>-{axis}</button>
                    <button className="btn text-xs flex-1" onClick={() => nudge(axis, 10)}>+{axis}</button>
                  </div>
                ))}
              </div>

              <div className="label mt-3 mb-1">Exact position</div>
              <div className="grid grid-cols-3 gap-1">
                {(["x","y","z"] as const).map((axis) => (
                  <input
                    key={axis}
                    className="input text-xs"
                    type="number"
                    value={selected[axis]}
                    onChange={(e) =>
                      updatePlacement(selected.instanceId, { [axis]: Number(e.target.value) } as any)
                    }
                  />
                ))}
              </div>

              {selectedIssues.length > 0 && (
                <div className="mt-3 border-t border-line pt-2">
                  {selectedIssues.map((i, idx) => (
                    <div key={idx} className={`text-xs ${i.severity === "error" ? "text-err" : "text-warn"}`}>
                      {i.severity}: {i.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted">Click a package in the scene to select it.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function cameraForView(v: ViewPreset, truck: Truck): [number, number, number] {
  // Three.js uses meters-scale. We scale truck mm to units with 1 unit = 100mm.
  const L = truck.lengthMm / 100;
  const W = truck.widthMm / 100;
  const H = truck.heightMm / 100;
  switch (v) {
    case "iso": return [L * 1.5, H * 2.5, W * 2.5];
    case "front": return [L * 2.5, H / 2, 0];
    case "rear": return [-L * 1.5, H / 2, 0];
    case "left": return [L / 2, H / 2, -W * 3];
    case "right": return [L / 2, H / 2, W * 3];
    case "top": return [L / 2, H * 4, 0.01];
  }
}

// -----------------------------------------------------------------------------
// 3D scene

function SceneRoot({
  truck,
  placements,
  selectedId,
  onSelect,
  showWalls,
  showLabels,
  transparency,
}: {
  truck: Truck;
  placements: Placement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showWalls: boolean;
  showLabels: boolean;
  transparency: number;
}) {
  // Scale: 1 unit = 100mm.
  const scale = 1 / 100;
  const L = truck.lengthMm * scale;
  const W = truck.widthMm * scale;
  const H = truck.heightMm * scale;

  return (
    <group position={[-L / 2, 0, -W / 2]}>
      {/* Floor grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[L / 2, 0, W / 2]} onClick={() => onSelect(null)}>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color="#0f1a30" />
      </mesh>

      {/* Truck shell */}
      <mesh position={[L / 2, H / 2, W / 2]}>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial color="#2a4a7a" transparent opacity={showWalls ? 0.08 : 0.0} depthWrite={false} />
        <Edges color="#60a5fa" />
      </mesh>

      {/* Restricted zones */}
      {truck.restrictions.map((r) => (
        <mesh key={r.id} position={[(r.x + r.lengthMm / 2) * scale, (r.z + r.heightMm / 2) * scale, (r.y + r.widthMm / 2) * scale]}>
          <boxGeometry args={[r.lengthMm * scale, r.heightMm * scale, r.widthMm * scale]} />
          <meshStandardMaterial color="#f87171" transparent opacity={0.35} />
          <Edges color="#ef4444" />
        </mesh>
      ))}

      {/* Packages */}
      {placements.map((p) => (
        <PackageBox
          key={p.instanceId}
          p={p}
          scale={scale}
          selected={p.instanceId === selectedId}
          onSelect={() => onSelect(p.instanceId)}
          showLabel={showLabels}
          opacity={transparency}
        />
      ))}

      {/* Origin axes marker */}
      <mesh position={[0.05, 0.05, 0.05]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}

function PackageBox({
  p,
  scale,
  selected,
  onSelect,
  showLabel,
  opacity,
}: {
  p: Placement;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  showLabel: boolean;
  opacity: number;
}) {
  const cx = (p.x + p.lengthMm / 2) * scale;
  const cz = (p.z + p.heightMm / 2) * scale;
  const cy = (p.y + p.widthMm / 2) * scale;
  const sx = p.lengthMm * scale;
  const sy = p.heightMm * scale;
  const sz = p.widthMm * scale;
  return (
    <group position={[cx, cz, cy]}>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial
          color={p.color}
          transparent
          opacity={selected ? 1 : opacity}
          emissive={selected ? p.color : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
        />
        <Edges color={selected ? "#ffffff" : "#000000"} />
      </mesh>
      {showLabel && (
        <Html position={[0, sy / 2 + 0.1, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div className="text-[10px] bg-black/70 border border-white/20 rounded px-1 py-0.5 whitespace-nowrap">
            {p.sku} · {p.weightKg}kg
          </div>
        </Html>
      )}
    </group>
  );
}

// -----------------------------------------------------------------------------
// 2D views (top/front/side) rendered as SVG

function TwoDView({
  truck,
  placements,
  mode,
  selectedId,
  onSelect,
  showLabels,
}: {
  truck: Truck;
  placements: Placement[];
  mode: "top" | "front" | "side";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showLabels: boolean;
}) {
  // Choose two axes based on mode.
  const dims = useMemo(() => {
    if (mode === "top") return { aw: truck.lengthMm, ah: truck.widthMm, label: "X (length) × Y (width)" };
    if (mode === "front") return { aw: truck.widthMm, ah: truck.heightMm, label: "Y (width) × Z (height)" };
    return { aw: truck.lengthMm, ah: truck.heightMm, label: "X (length) × Z (height)" };
  }, [mode, truck]);

  const pad = 24;
  const vw = 900, vh = 560;
  const sx = (vw - pad * 2) / dims.aw;
  const sy = (vh - pad * 2) / dims.ah;
  const s = Math.min(sx, sy);
  const ox = pad, oy = pad;

  const rectFor = (p: Placement) => {
    if (mode === "top") return { x: p.x, y: p.y, w: p.lengthMm, h: p.widthMm };
    if (mode === "front") return { x: p.y, y: dims.ah - p.z - p.heightMm, w: p.widthMm, h: p.heightMm };
    return { x: p.x, y: dims.ah - p.z - p.heightMm, w: p.lengthMm, h: p.heightMm };
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-3 py-2 text-xs text-muted border-b border-line">{mode.toUpperCase()} view · {dims.label}</div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full h-full bg-[#0f1a30]" onClick={() => onSelect(null)}>
        <rect x={ox} y={oy} width={dims.aw * s} height={dims.ah * s} fill="none" stroke="#60a5fa" />
        {placements.map((p) => {
          const r = rectFor(p);
          const sel = p.instanceId === selectedId;
          return (
            <g key={p.instanceId} onClick={(e) => { e.stopPropagation(); onSelect(p.instanceId); }} style={{ cursor: "pointer" }}>
              <rect
                x={ox + r.x * s}
                y={oy + r.y * s}
                width={r.w * s}
                height={r.h * s}
                fill={p.color}
                fillOpacity={sel ? 0.95 : 0.75}
                stroke={sel ? "#fff" : "#000"}
                strokeWidth={sel ? 2 : 0.5}
              />
              {showLabels && r.w * s > 50 && r.h * s > 24 && (
                <text
                  x={ox + r.x * s + 4}
                  y={oy + r.y * s + 14}
                  fontSize={10}
                  fill="#111"
                  fontWeight={600}
                >
                  {p.sku}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
