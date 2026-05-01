import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use absolute base so deep-link refreshes (e.g. /admin, /planner) keep loading app assets correctly.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
