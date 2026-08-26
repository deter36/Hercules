import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Keep browser assets separate from TypeScript's Node/test output in dist/.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/Hercules/" : "/",
  plugins: [react()],
  build: { outDir: "playtest-dist" },
});
