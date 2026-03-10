// Demo mode utilities — DEMO_MODE=true activates cinematic dashboard enhancements
// This file is the single source of truth for demo mode state

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
