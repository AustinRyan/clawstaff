"use client";

import { ToastNotifications } from "./toast-notifications";
import { CursorTrail } from "./cursor-trail";
import { GradientMesh } from "./gradient-mesh";

// Wraps the dashboard with demo-mode visual effects
// Only rendered when DEMO_MODE=true
export function DemoWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientMesh />
      <CursorTrail />
      <ToastNotifications />
      {children}
    </>
  );
}
