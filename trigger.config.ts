import { defineConfig } from "@trigger.dev/sdk/v3";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: "proj_hogagmocthrpqsvtgmxe",
  dirs: ["./triggers"],
  maxDuration: 600,
  build: {
    extensions: [
      prismaExtension({
        mode: "legacy",
        schema: "prisma/schema.prisma",
        version: "5.22.0",
      }),
    ],
  },
});
