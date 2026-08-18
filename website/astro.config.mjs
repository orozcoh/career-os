import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { stageResumes } from "./src/lib/stage-resumes.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://cv.orozcoh.com",
  output: "static",
  integrations: [stageResumes()],
  vite: {
    plugins: [tailwindcss()],
  },
});
