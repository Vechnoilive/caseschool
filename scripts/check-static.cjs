const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const files=['index.html','styles.css','data.js','rules.js','app.js','dataset-summary.js'];
for(const name of files){assert.ok(fs.existsSync(name),name);const text=fs.readFileSync(name,'utf8');assert.ok(!/https?:\/\//.test(text),name+': external URL');if(name.endsWith('.js'))assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(text),name+': network call');}
const html=fs.readFileSync('index.html','utf8');
for(const m of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){if(m[1].startsWith('assets/')||m[1].endsWith('.js')||m[1].endsWith('.css'))assert.ok(fs.existsSync(m[1]),m[1]);}
assert.ok(html.includes('Прототип команды «Рэд флаг» · данные условные'));
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.equal(config.outputDirectory,'dist');
assert.ok(config.headers[0].headers.some(x=>x.key==='Content-Security-Policy'&&x.value.includes("connect-src 'none'")));
console.log('Локальные ресурсы, маркировка прототипа, отсутствие сетевых API и конфигурация Vercel: OK');
