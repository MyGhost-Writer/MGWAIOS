import { createHealthReport } from "@mgwaios/core";

const report = createHealthReport("worker");

console.log(JSON.stringify(report, null, 2));
console.log("MGWAIOS worker scaffold is ready. Queue processing will be added next.");
