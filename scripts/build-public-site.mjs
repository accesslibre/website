import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../',import.meta.url));
const source = path.join(root,'preview/next');
const output = path.join(root,'dist-libreaccessibility');
const rootFiles = /\.(html|xml|txt)$|^support\.js$/;
const folders = ['assets','css','js','vendor'];
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(output,{recursive:true});
for (const entry of await fs.readdir(source,{withFileTypes:true})) {
  if ((entry.isFile() && rootFiles.test(entry.name)) || (entry.isDirectory() && folders.includes(entry.name))) {
    await fs.cp(path.join(source,entry.name),path.join(output,entry.name),{recursive:true});
  }
}
// Nested URLs and custom 404s must resolve the same assets as flat pages.
for (const name of await fs.readdir(output)) {
  if (!name.endsWith('.html')) continue;
  const filename=path.join(output,name);
  let html=await fs.readFile(filename,'utf8');
  html=html.replace(/(<head>)/,'$1\n<base href="/">');
  await fs.writeFile(filename,html);
}
console.log('Built public website assets without local servers, review reports or README files.');
