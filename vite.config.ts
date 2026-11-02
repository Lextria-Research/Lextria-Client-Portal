import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
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
  envPrefix: ['VITE_', 'SUPABASE_'],
  server: {
    port: 5174,
  },
});

