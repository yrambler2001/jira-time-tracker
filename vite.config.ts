import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/proxy": {
        target: (([req]: any) =>
          new URL(req.originalUrl.replace(/^\/proxy\//, ""))
            .origin) as unknown as string,
        changeOrigin: true,
        secure: true,
        headers: {
          "User-Agent": "XSRF", //https://community.atlassian.com/t5/Jira-questions/XSRF-check-failed-403/qaq-p/1406999
        },
        rewrite: (path) => path.replace(/^\/proxy\//, ""),
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
