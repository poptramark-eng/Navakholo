import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "navakholo",
    framework: "nextjs",
    env: ".env",
  },
});
