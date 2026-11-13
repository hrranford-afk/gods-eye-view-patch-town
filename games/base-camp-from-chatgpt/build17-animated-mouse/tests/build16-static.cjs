const fs = require('fs'), assert = require('node:assert/strict');
const t = fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
for(const s of ["const BUILD = 'build 17 · animated mouse'",'function mkMouseScout(c)', 'function scout16Texture(kind)',"scout16Mat('felt')",'sm16Parchment','fieldMap','function startPractice()',"if (c.scout) return mkMouseScout(c)","scout: !!c.scout",'ceilEvac','bPrac']) assert(t.includes(s),s);
for(const s of ['<script type="module"']) assert(!t.includes(s), 'unexpected new dependency: '+s);
console.log('PASS: Build 16 scout, materials, game systems and save markers remain.');
