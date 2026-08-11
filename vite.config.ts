import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fallback if the package export map ever blocks `?url` resolution.
      '@plantuml/core/viz-global.js': path.resolve(
        __dirname,
        'node_modules/@plantuml/core/viz-global.js',
      ),
    },
  },
  optimizeDeps: {
    exclude: ['@plantuml/core'],
  },
})
