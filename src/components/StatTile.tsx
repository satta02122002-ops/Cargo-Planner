import { ReactNode } from "react";
import clsx from "clsx";

export default function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "ok" | "warn" | "err";
}) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div
        className={clsx(
          "text-2xl font-semibold mt-1",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "err" && "text-err"
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
