const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'../..');

test('el HTML ensamblado conserva scripts inline sintácticamente válidos',()=>{
  const index=fs.readFileSync(path.join(root,'src/ui/Index.html'),'utf8');
  const html=index.replace(/<\?!=\s*include\('([^']+)'\);\s*\?>/g,(_,name)=>
    fs.readFileSync(path.join(root,'src',`${name}.html`),'utf8').replace(/https:\/\//g,'https:\\x2f\\x2f')
  );
  assert.doesNotMatch(html,/https:\/\//);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
  assert.equal(scripts.length,2);
  scripts.forEach((source,index)=>new vm.Script(source,{filename:`inline-${index+1}.js`}));
});
