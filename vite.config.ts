import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { jiraTarget } from "./env";

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/test1": {
        target: jiraTarget,
        changeOrigin: true,
        secure: true,
        headers: {
          "User-Agent": "XSRF", //https://community.atlassian.com/forums/Jira-questions/XSRF-check-failed-403/qaq-p/1406999
        },
        rewrite: (path) => path.replace(/^\/test1/, ""), // strip /test1 prefix
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
