import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 相対パスで出力するので、GitHub Pages などのサブパスにもそのまま置ける
  base: "./",
  server: {
    // リポジトリ直下の cards/cards.json を読み込むため
    fs: { allow: [".."] },
  },
});
