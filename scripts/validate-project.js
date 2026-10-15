'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const gs=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.endsWith('.gs'))gs.push(full);}}
walk(path.join(root,'src'));
for(const file of gs){new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'src','appsscript.json'),'utf8'));
if(manifest.runtimeVersion!=='V8')throw new Error('El runtime debe ser V8.');
for(const html of ['App.html','ApiClient.html']){
  const source=fs.readFileSync(path.join(root,'src','ui',html),'utf8');
  const match=source.match(/^\s*<script>([\s\S]*)<\/script>\s*$/i);
  if(!match)throw new Error(`${html} debe contener una etiqueta script completa`);
  new vm.Script(match[1],{filename:html});
}
const schemaSource=fs.readFileSync(path.join(root,'src','repositories','sheets','Schema.gs'),'utf8');
const schemaContext={};vm.createContext(schemaContext);vm.runInContext(schemaSource,schemaContext);
const names=schemaContext.SheetSchema.names();
if(names.length!==19)throw new Error(`Se esperaban 19 hojas; se hallaron ${names.length}.`);
const seedSource=fs.readFileSync(path.join(root,'src','bootstrap','Seed.gs'),'utf8');
const seedContext={};vm.createContext(seedContext);vm.runInContext(seedSource,seedContext);
if(seedContext.SeedData.rubric.length!==15)throw new Error('La semilla debe tener 15 criterios.');
if(seedContext.SeedData.rubric.some(r=>r.length!==6||r.slice(3).some(v=>!v)))throw new Error('Cada criterio debe tener tres descriptores.');
if(seedContext.SeedData.general.length!==6)throw new Error('La semilla debe tener seis criterios generales.');
console.log(`OK: ${gs.length} archivos GS, UI válida, ${names.length} hojas, 15 criterios y 45 descriptores.`);
