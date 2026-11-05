import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Server-only variables used by api/portal-data.js. They are loaded into process.env for
// the local dev API middleware only, and are NEVER exposed to the browser bundle.
const SERVER_ONLY_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PORTAL_ALLOWED_ORIGINS'];

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  for (const key of SERVER_ONLY_ENV) {
    if (fileEnv[key] && !process.env[key]) process.env[key] = fileEnv[key];
  }

  return {
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'portal-data-api-dev',
      configureServer(server) {
        server.middlewares.use('/api/portal-data', async (req, res) => {
          try {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const query = Object.fromEntries(url.searchParams.entries());
            // @ts-ignore
            const mod = await import('./api/portal-data.js');
            const handler = mod.default;

            const mockReq = {
              method: req.method,
              query,
              headers: req.headers,
            };

            const mockRes = {
              setHeader(k: string, v: string) { res.setHeader(k, v); },
              status(code: number) {
                res.statusCode = code;
                return {
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end() { res.end(); }
                };
              }
            };

            await handler(mockReq, mockRes);
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      }
    }
  ],
  // Only VITE_* variables reach the browser. SUPABASE_* (including the service-role
  // key) must stay server-side, so it is deliberately not listed here.
  envPrefix: ['VITE_'],
  server: {
    port: 5174,
  },
  };
});

