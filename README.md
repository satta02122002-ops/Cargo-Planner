# Cargo Planner

Interactive truck loading planner with a real 3D bin-packing engine. Decide
how many packages fit, which ones don't, where each goes, and inspect the
whole plan in 3D before loading.

## Status (V1)

This is a functional V1 built in a single pass. The following are **real**:

- Deterministic heuristic 3D bin-packing engine (corner/extreme-point
  heuristic) with rotation (6 orientations), stacking rules, max-stack
  limits, keep-upright, non-stackable floor-only placement, restricted
  zones (wheel arches, obstacles), door-opening check, and weight budget.
- Weight distribution + center-of-gravity + balance warning.
- Interactive 3D viewer (React Three Fiber + Drei) with click-to-select,
  camera presets (iso / front / rear / left / right / top), toggle walls
  and labels, transparency slider, and a 2D top/front/side SVG view.
- Manual placement editing with live boundary / collision / support
  validation.
- CSV import, bulk paste (tab / pipe / comma), CSV export, JSON plan
  export, browser Print → PDF.
- Shipment save & reopen (truck + cargo + plan snapshot).
- 8 engine tests covering fit/no-fit, rotation, weight, multi-pack,
  stacking, door, restricted zones.

Deliberate V1 compromises (vs. the full spec):

- **Frontend-only.** State is persisted to `localStorage` via Zustand
  rather than Postgres/Prisma/Express. The engine lives behind a pure TS
  module boundary (`src/engine/*`) so a REST layer can be dropped in
  later without touching the UI.
- Drag-and-drop in 3D is not wired; nudging and exact-coord editing in
  the side panel does the same job and is simpler to validate against.
- Export produces CSV + JSON + browser-printed PDF rather than a
  server-rendered PDF.
- Authentication is omitted — add it when the backend goes in.

The engine is heuristic, not optimal — the UI never claims otherwise.

## Stack

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS for styling
- Three.js + @react-three/fiber + @react-three/drei
- Zustand (with `persist` → localStorage) for state
- Vitest for engine tests
- Zod available for future API validation (not used in V1 since there is no backend)

## Run

```bash
npm install
npm run dev        # start dev server
npm run test       # run engine tests
npm run build      # typecheck + production build
npm run preview    # preview the production build
```

Open <http://localhost:5173>.

## Architecture

```
src/
  engine/            Pure TS packing engine — no React, framework-agnostic
    types.ts         Domain types (Truck, CargoItem, Placement, LoadingPlan, …)
    geometry.ts      AABB, orientations, overlap, inside-truck helpers
    packer.ts        generatePlan(truck, cargo, { strategy }) → LoadingPlan
    validation.ts    Per-placement + whole-plan validators
    color.ts         Deterministic per-SKU colors
    packer.test.ts   Vitest suite
  store/
    store.ts         Zustand store (persisted)
    demoData.ts      Demo trucks + 10 SKUs
  pages/             Dashboard, Trucks, Cargo, Planner, ThreeView, Shipments, Settings
  components/        PageHeader, StatTile, StatusBadge
```

The engine is the only place with cargo-planning logic. Pages call
`generatePlan` or validators; they do not do their own geometry.

## Packing algorithm (heuristic)

1. Reject cargo that cannot fit the truck in any allowed orientation.
2. Reject cargo that cannot pass through the door opening (any allowed
   orientation).
3. Expand each cargo item into individual package instances.
4. Sort instances by the chosen strategy
   (`MAX_QUANTITY` / `MAX_WEIGHT_EFFICIENCY` / `PRIORITY_FIRST` / `BALANCED`).
5. Maintain a candidate position set seeded with the truck origin plus
   corner points derived from each restricted zone.
6. For each instance, scan candidates in (z, x, y) order; for each
   candidate try each allowed orientation. Accept the first that:
   - fits within truck bounds,
   - does not overlap any placement or restricted zone,
   - is either on the floor or fully supported from below (4 footprint
     corners rest on stackable, non-fragile boxes),
   - respects the cargo's `maxStack` and `keepUpright`,
   - does not push the running weight past `maxPayloadKg`.
7. On placement, push three new corner candidates at the +X / +Y / +Z
   corners of the placed box.
8. Return loaded placements, unloaded items (with reasons), summary +
   weight distribution.

Deterministic for a given input — same inputs always produce the same plan.

## API shape (for future backend)

The engine is already shaped like the REST API spec in the brief:

```
POST /api/loading-plans/generate   → generatePlan(truck, cargo, opts)
POST /api/loading-plans/:id/validate → validatePlan(placements, truck, cargoById)
```

Adding Express/Prisma means wrapping the existing modules in route
handlers; no engine changes.

## Future improvements

- Postgres + Prisma backend with the API routes above.
- Advanced optimizer behind the same `generatePlan` signature
  (guillotine cuts, GA, LP relaxation).
- Drag-in-3D with transform controls.
- Server-rendered PDF export.
- Multi-truck / multi-drop planning.
- Barcode / QR scanning on mobile.
- Auth + RBAC + per-user shipment history.
