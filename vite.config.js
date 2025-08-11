import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react()],
  // pakai nama repo sebagai base agar asset & SW betul di GitHub Pages
  base: '/impact_weather_map/',
})

