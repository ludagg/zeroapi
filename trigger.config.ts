import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "zeroapi",
  dirs: ["./triggers"],
  maxDuration: 600,
});
