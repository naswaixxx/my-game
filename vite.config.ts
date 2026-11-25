import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { partnerStub } from "./stub/partnerStub.ts";

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "stub" ? [partnerStub()] : [])],
  server: {
    host: "127.0.0.1",
    watch: { ignored: ["**/.vs/**"] },
  },
  preview: { host: "127.0.0.1" },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
