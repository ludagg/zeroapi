import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_zeroapi",
  runtime: "node",
  logLevel: "log",
  maxDuration: 600,
  dirs: ["./triggers"],
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 1 },
  },
});
