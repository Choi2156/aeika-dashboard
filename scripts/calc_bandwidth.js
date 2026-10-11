import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function getDirFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getDirFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const distFiles = getDirFiles('dist');
let totalBytes = 0;
let gzipBytes = 0;

const categories = {
  html: [],
  js: [],
  css: [],
  json: [],
  images: [],
  other: []
};

distFiles.forEach(f => {
  const buf = fs.readFileSync(f);
  const size = buf.length;
  const gzSize = zlib.gzipSync(buf).length;
  totalBytes += size;
  gzipBytes += gzSize;

  const ext = path.extname(f).toLowerCase();
  const rel = path.relative('dist', f);
  const info = { path: rel, size, gzSize };

  if (ext === '.html') categories.html.push(info);
  else if (ext === '.js') categories.js.push(info);
  else if (ext === '.css') categories.css.push(info);
  else if (ext === '.json') categories.json.push(info);
  else if (['.webp', '.png', '.jpg', '.svg', '.ico'].includes(ext)) categories.images.push(info);
  else categories.other.push(info);
});

console.log('=== 1. DIST DIRECTORY TOTALS ===');
console.log('Total Raw Size: ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB');
console.log('Total Gzip Size: ' + (gzipBytes / 1024 / 1024).toFixed(2) + ' MB');

console.log('\n=== 2. CATEGORY BREAKDOWN ===');
for (const [cat, items] of Object.entries(categories)) {
  const catRaw = items.reduce((a, b) => a + b.size, 0);
  const catGz = items.reduce((a, b) => a + b.gzSize, 0);
  console.log('[' + cat.toUpperCase() + '] count: ' + items.length + ' | Raw: ' + (catRaw / 1024).toFixed(1) + ' KB | Gzip: ' + (catGz / 1024).toFixed(1) + ' KB');
}

console.log('\n=== 3. INITIAL LOAD ESTIMATE (Core Assets) ===');
// Typical assets loaded on initial page visit:
// index.html
// Main JS chunk + CSS
// JSON data files (fetched on startup)
// Essential icons & calendar
const htmlSize = categories.html.reduce((a, b) => a + b.gzSize, 0);
// Main JS / CSS
const jsMain = categories.js.find(j => j.path.includes('index-')) || { gzSize: 86 * 1024 };
const cssMain = categories.css.find(c => c.path.includes('index-')) || { gzSize: 17 * 1024 };
const jsonGz = categories.json.reduce((a, b) => a + b.gzSize, 0);
const jsonRaw = categories.json.reduce((a, b) => a + b.size, 0);

console.log('Core HTML (gzip): ' + (htmlSize / 1024).toFixed(1) + ' KB');
console.log('Core JS (gzip): ' + (jsMain.gzSize / 1024).toFixed(1) + ' KB');
console.log('Core CSS (gzip): ' + (cssMain.gzSize / 1024).toFixed(1) + ' KB');
console.log('All JSON data (raw): ' + (jsonRaw / 1024).toFixed(1) + ' KB, (gzip): ' + (jsonGz / 1024).toFixed(1) + ' KB');

// Find icons & calendar
const essentialImages = categories.images.filter(im => 
  im.path.includes('icon_') || 
  im.path.includes('default_') || 
  im.path.includes('calendar_current.webp')
);
const essImgSize = essentialImages.reduce((a, b) => a + b.size, 0);
console.log('Essential UI Icons & Active Calendar: ' + (essImgSize / 1024).toFixed(1) + ' KB');

const initialFirstVisitTransfer = htmlSize + jsMain.gzSize + cssMain.gzSize + jsonGz + essImgSize;
console.log('\n===> Estimated 1st Visit Transfer (Cold Cache): ' + (initialFirstVisitTransfer / 1024).toFixed(1) + ' KB (~' + (initialFirstVisitTransfer / 1024 / 1024).toFixed(2) + ' MB)');

// Repeat visit (Warm Cache):
// JS, CSS, WebP images, HTML are cached with HTTP 304 or browser disk cache.
// JSON data files have 10-minute cache busting query param (t=...).
// So repeat visit within 10 mins: ~0 KB transfer.
// Repeat visit after 10 mins: only JSON data + 304 revalidations = ~30-50 KB.
console.log('===> Estimated Repeat Visit Transfer (Warm Cache): ~30 - 80 KB');

console.log('\n=== 4. GITHUB PAGES 100GB BANDWIDTH CAPACITY SIMULATION ===');
const limitBytes = 100 * 1024 * 1024 * 1024; // 100 GB

const coldVisitsMax = Math.floor(limitBytes / initialFirstVisitTransfer);
console.log('Max 100% Cold Visits per Month (every visit downloads all): ' + coldVisitsMax.toLocaleString() + ' visits (~' + Math.floor(coldVisitsMax / 30).toLocaleString() + ' visits/day)');

// Realistic average visit (assuming 30% cold visits, 70% warm visits with ~60KB avg):
const avgTransfer = (initialFirstVisitTransfer * 0.3) + (60 * 1024 * 0.7);
const realisticVisitsMax = Math.floor(limitBytes / avgTransfer);
console.log('Realistic Mixed Visits per Month (30% cold / 70% warm cache): ' + realisticVisitsMax.toLocaleString() + ' visits (~' + Math.floor(realisticVisitsMax / 30).toLocaleString() + ' visits/day)');
console.log('Daily PV capacity: ~' + Math.floor(realisticVisitsMax / 30).toLocaleString() + ' PV / day');
