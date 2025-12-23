import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  //const apiUrl = 'http://127.0.0.1:8000';
  const apiUrl = env.VITE_API_PROXY_TARGET || (mode === "development" ? "http://127.0.0.1:8000" : "https://www.api.archi-drive.ga");
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
