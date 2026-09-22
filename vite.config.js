import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { generateCalendar } from './scripts/generateCalendar.js'

function scheduleAutoCalendarPlugin() {
  let debounceTimer = null;
  return {
    name: 'schedule-auto-calendar',
    configureServer(server) {
      server.watcher.on('change', (filePath) => {
        const normalized = filePath.replace(/\\/g, '/');
        if (
          normalized.includes('public/data/schedule_data.json') ||
          normalized.includes('public/data/schedule_hints.json') ||
          normalized.includes('public/data/schedule_updates.json')
        ) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('\n[Vite Dev] Schedule data change detected! Auto-updating calendar...');
            generateCalendar();
          }, 1000);
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), scheduleAutoCalendarPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
