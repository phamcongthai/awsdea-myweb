import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
let root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Vite 6 treats # in Windows filesystem imports as a URL fragment. Use a
// stable junction with preserved module paths; never rename the user's repo.
if(process.platform==='win32'&&root.includes('#')){
 const alias=path.join(os.tmpdir(),'architect-vitest-'+crypto.createHash('sha256').update(root).digest('hex').slice(0,12));
 if(!fs.existsSync(alias))fs.symlinkSync(root,alias,'junction');
 if(fs.realpathSync(alias)!==fs.realpathSync(root))throw Error('Test junction points to a different workspace.');
 root=alias;
}
const result=spawnSync(process.execPath,['--preserve-symlinks','--preserve-symlinks-main',path.join(root,'node_modules/vitest/vitest.mjs'),'run','tests/data.test.mjs'],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,NODE_OPTIONS:((process.env.NODE_OPTIONS||'')+' --preserve-symlinks --preserve-symlinks-main').trim()}});
process.exit(result.status??1);
