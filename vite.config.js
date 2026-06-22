import { defineConfig } from "vite";

// base:'./' → suhteelliset polut dist/:ssä, jotta sivu toimii myös alipolussa
// (esim. Puterin staattinen hosting).
export default defineConfig({
  base: "./",
});
