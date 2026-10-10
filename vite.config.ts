import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    build: {
      rolldownOptions: {
        output: {
          // Librerías en archivos propios (T-06): cambian poco, así que el navegador las guarda
          // en caché entre versiones de la web. ogl (WebGL de los fondos) va aparte porque se
          // carga después, con el fondo o con la pantalla de acceso.
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
              { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
              { name: 'datos', test: /node_modules[\\/](@tanstack|zod)[\\/]/ },
              { name: 'gsap', test: /node_modules[\\/]gsap[\\/]/ },
              { name: 'ogl', test: /node_modules[\\/]ogl[\\/]/ },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      env: {
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      },
    },
  }
})
