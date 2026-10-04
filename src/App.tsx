import { NavLink, Route, Routes } from "react-router-dom";
import clsx from "clsx";
import Dashboard from "./pages/Dashboard";
import Trucks from "./pages/Trucks";
import Cargo from "./pages/Cargo";
import Planner from "./pages/Planner";
import ThreeView from "./pages/ThreeView";
import Shipments from "./pages/Shipments";
import Settings from "./pages/Settings";

const nav: { to: string; label: string }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/trucks", label: "Trucks" },
  { to: "/cargo", label: "Cargo" },
  { to: "/planner", label: "Loading Planner" },
  { to: "/view", label: "3D View" },
  { to: "/shipments", label: "Shipments" },
  { to: "/settings", label: "Settings" },
];

export default function App() {
  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 bg-panel border-r border-line p-4 flex flex-col gap-1">
        <div className="mb-4">
          <div className="text-xl font-semibold tracking-tight">Cargo Planner</div>
          <div className="text-xs text-muted">3D loading optimization</div>
        </div>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) =>
              clsx(
                "px-3 py-2 rounded-md text-sm hover:bg-line",
                isActive && "bg-line text-accent"
              )
            }
          >
            {n.label}
          </NavLink>
        ))}
        <div className="mt-auto text-[11px] text-muted/70 pt-4 border-t border-line">
          V1 · demo build
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trucks" element={<Trucks />} />
          <Route path="/cargo" element={<Cargo />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/view" element={<ThreeView />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
