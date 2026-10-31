import type { HealthState } from "../engine/types";

export const STATE_COLORS: Record<HealthState, string> = {
  healthy: "var(--color-health-ok)",
  degraded: "var(--color-health-warn)",
  overloaded: "var(--color-health-bad)",
  down: "var(--color-health-down)",
};
