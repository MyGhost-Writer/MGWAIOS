export const mgwaiosVersion = "0.1.0";

export type RuntimeName = "api" | "worker" | "web" | "script";

export interface HealthReport {
  service: RuntimeName;
  version: string;
  status: "ok";
  timestamp: string;
}

export function createHealthReport(service: RuntimeName): HealthReport {
  return {
    service,
    version: mgwaiosVersion,
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}
