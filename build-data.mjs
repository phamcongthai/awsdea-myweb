import {build} from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['src/data-app.jsx'],bundle:true,platform:'browser',format:'esm',target:['es2022'],minify:true,outfile:'public/architect/data-app.js',legalComments:'linked',define:{'process.env.NODE_ENV':'"production"'}});
fs.writeFileSync('public/architect/data-LICENSES.txt',['Dependencies bundled locally; no CDN runtime requests.','React / React DOM: MIT','@xyflow/react: MIT','AlaSQL: MIT',...['react','react-dom','@xyflow/react','alasql'].map(p=>{const names=['LICENSE','LICENSE.md','LICENSE.txt'];const file=names.map(n=>'node_modules/'+p+'/'+n).find(fs.existsSync);return '\n'+p+'\n'+(file?fs.readFileSync(file,'utf8'):'See npm package license metadata.');})].join('\n'));
console.log('Built Data Engineering World browser bundle. Run build-architect.ps1 to refresh offline manifest.');
