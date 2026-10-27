const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
for (const file of fs.readdirSync(out)) fs.rmSync(path.join(out, file), { recursive: true, force: true });
for (const file of ['index.html','styles.css','tour.css','data.js','rules.js','journey.js','app.js','tour.js','dataset-summary.js']) {
  fs.copyFileSync(path.join(root,file), path.join(out,file));
}
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
console.log('Готов статический сайт dist/');
