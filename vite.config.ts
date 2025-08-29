import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

const matchURL = (url: string) => {
  // const url = "https://jira.abc.me/proxy/ab-cd_ef/rest/api/3/myself";
  const regex = /\/proxy\/([^/]+)(\/rest\/.*)/;
  const match = url.match(regex);

  if (match) {
    const first = match[1]; // "ab-cd_ef"
    const origin = `https://${first}.atlassian.net`;
    const path = match[2]; // "/rest/api/3/myself"
    return new URL(origin + path);
  }
};

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/proxy': {
        target: (([req]: any) => matchURL(req.originalUrl).origin) as unknown as string,
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent': 'XSRF', // https://community.atlassian.com/t5/Jira-questions/XSRF-check-failed-403/qaq-p/1406999
        },
        rewrite: (path) => {
          const url = matchURL(`https://a.com/${path}`);
          return url.href.replace(url?.origin, '');
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
