import clsx from "clsx";
import type { LoadingStatus } from "@/engine/types";

const map: Record<LoadingStatus, { label: string; cls: string }> = {
  LOADED: { label: "Loaded", cls: "border-ok/50 text-ok bg-ok/10" },
  LOADING_COMPLETE: { label: "Loading Complete", cls: "border-ok/50 text-ok bg-ok/10" },
  PARTIALLY_LOADED: { label: "Partially Loaded", cls: "border-warn/50 text-warn bg-warn/10" },
  CANNOT_LOAD: { label: "Cannot Load", cls: "border-err/50 text-err bg-err/10" },
  WEIGHT_EXCEEDED: { label: "Weight Exceeded", cls: "border-err/50 text-err bg-err/10" },
  DIMENSION_EXCEEDED: { label: "Dimension Exceeded", cls: "border-err/50 text-err bg-err/10" },
};

export default function StatusBadge({ status }: { status: LoadingStatus }) {
  const m = map[status];
  return <span className={clsx("badge", m.cls)}>{m.label}</span>;
}
