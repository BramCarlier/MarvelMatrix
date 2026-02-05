import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// GitHub Pages: set BASE to "/<repo-name>/"
const repo = process.env.GITHUB_REPO ?? "mcu-recap-timeline";
export default defineConfig({
  plugins: [vue()],
  base: `/${repo}/`
});
