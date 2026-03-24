import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-simple-maps': 'react-simple-maps',
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  // Ensure all dependencies are bundled to avoid browser resolution issues
  optimizeDeps: {
    include: [
      'react-simple-maps', 
      'd3-geo', 
      'd3-selection', 
      'd3-transition', 
      'd3-zoom', 
      'd3-drag',
      'topojson-client'
    ]
  }
})
