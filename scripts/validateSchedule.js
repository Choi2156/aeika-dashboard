import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processEvents } from '../src/engine/scheduler.js';
import { validateSchedule, formatValidationReport } from '../src/engine/validator.js';
import { GAMES_CONFIG } from '../src/config/gamesConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadJson(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function runValidation() {
  const scheduleData = loadJson('public/data/schedule_data.json') || { events: [] };
  const updatesData = loadJson('public/data/schedule_updates.json') || [];
  const hintsData = loadJson('public/data/schedule_hints.json') || { hints: [] };

  const baseEvents = scheduleData.events || [];
  const updateEvents = Array.isArray(updatesData) ? updatesData : [];
  const mergedMap = new Map();

  baseEvents.forEach(evt => {
    if (evt && evt.id) mergedMap.set(evt.id, evt);
  });
  updateEvents.forEach(evt => {
    if (evt && evt.id) {
      const existing = mergedMap.get(evt.id);
      if (existing) mergedMap.set(evt.id, { ...existing, ...evt });
      else mergedMap.set(evt.id, evt);
    }
  });
  const mergedEvents = Array.from(mergedMap.values());

  const allEvents = processEvents(
    { ...scheduleData, events: mergedEvents },
    hintsData,
    GAMES_CONFIG
  );

  const result = validateSchedule(allEvents, GAMES_CONFIG, hintsData);
  const report = formatValidationReport(result);

  console.log(report);

  if (!result.isValid) {
    process.exit(1);
  }
}

runValidation();
