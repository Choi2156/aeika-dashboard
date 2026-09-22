import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const agentRoot = path.resolve(rootDir, '..');
const calendarScriptPath = path.join(agentRoot, '000_Operations_Guides', 'scripts', 'generate_calendar.py');

/**
 * Find suitable python executable on the host system
 */
function findPythonCmd() {
  if (process.env.PYTHON && fs.existsSync(process.env.PYTHON)) {
    return process.env.PYTHON;
  }
  const candidates = ['python', 'python3', 'py'];
  for (const cmd of candidates) {
    const test = spawnSync(cmd, ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    if (!test.error && test.status === 0) {
      return cmd;
    }
  }
  return 'python';
}

/**
 * Run calendar generation pipeline
 * @param {Object} options
 * @param {number} [options.year]
 * @param {number} [options.month]
 * @param {boolean} [options.allActive=true]
 */
export function generateCalendar(options = {}) {
  const { year, month, allActive = true } = options;
  console.log('\n[Calendar Pipeline] 🗓️  Generating monthly milestone calendars...');

  if (!fs.existsSync(calendarScriptPath)) {
    console.error(`[Calendar Pipeline] Error: Calendar script not found at ${calendarScriptPath}`);
    return false;
  }

  const pythonCmd = findPythonCmd();
  const args = [calendarScriptPath];

  if (allActive) {
    args.push('--all-active');
  }
  if (year) {
    args.push('--year', String(year));
  }
  if (month) {
    args.push('--month', String(month));
  }

  const result = spawnSync(pythonCmd, args, {
    cwd: agentRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });

  if (result.error) {
    console.error(`[Calendar Pipeline] Failed to execute Python generator:`, result.error.message);
    return false;
  }

  if (result.status !== 0) {
    console.error(`[Calendar Pipeline] Calendar generation exited with code ${result.status}`);
    return false;
  }

  console.log('[Calendar Pipeline] ✅ All milestone calendar assets synchronized successfully!\n');
  return true;
}

// Auto-run when executed directly via `node scripts/generateCalendar.js`
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  const success = generateCalendar();
  if (!success) {
    process.exit(1);
  }
}
