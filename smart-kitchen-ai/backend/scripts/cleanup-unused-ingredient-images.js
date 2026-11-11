// Chỉ dọn backend/uploads/ingredients. Mặc định kiểm tra, --apply mới xóa.
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const db=require('../src/config/db');
const root=path.resolve(__dirname,'../..');
const folder=path.join(root,'backend/uploads/ingredients');
const quote=value=>'`'+String(value).replace(/`/g,'``')+'`';
function normalized(value){const text=typeof value==='string'?value:JSON.stringify(value);try{return (text+'\n'+decodeURIComponent(text)).toLowerCase();}catch{return text.toLowerCase();}}
async function references(){
 const [columns]=await db.query("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND DATA_TYPE IN ('varchar','char','text','mediumtext','longtext','json') ORDER BY TABLE_NAME,COLUMN_NAME");
 const texts=[];
 for(const column of columns){const table=quote(column.TABLE_NAME),field=quote(column.COLUMN_NAME);const [rows]=await db.query(`SELECT ${field} AS value FROM ${table} WHERE ${field} IS NOT NULL`);for(const row of rows)texts.push(normalized(row.value));}
 const files=execFileSync('rg',['--files','-g','*.js','-g','*.jsx','-g','*.ts','-g','*.tsx','-g','*.json','-g','*.html','-g','*.css','-g','*.md','-g','*.svg','-g','!**/node_modules/**','-g','!**/dist/**','-g','!.git/**','-g','!backend/backups/**','-g','!backend/reports/**'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 for(const file of files)texts.push(normalized(await fs.readFile(path.join(root,file),'utf8')));
 return texts;
}
async function main(){
 const apply=process.argv.includes('--apply');
 const entries=await fs.readdir(folder,{withFileTypes:true});
 const files=[];
 for(const entry of entries){if(!entry.isFile()||! /\.(?:jpe?g|png|webp|gif|avif|svg)$/i.test(entry.name))continue;const stat=await fs.stat(path.join(folder,entry.name));files.push({name:entry.name,bytes:stat.size,modifiedAt:stat.mtime.toISOString()});}
 const texts=await references();
 const unused=files.filter(file=>!texts.some(text=>text.includes(file.name.toLowerCase())));
 const reportDir=path.join(root,'backend/reports');await fs.mkdir(reportDir,{recursive:true});
 const report=path.join(reportDir,`unused-ingredient-images-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
 const manifest={mode:apply?'APPLY':'AUDIT_ONLY',scope:'backend/uploads/ingredients',createdAt:new Date().toISOString(),files:files.length,referenced:files.length-unused.length,unused,deleted:[],skipped:[]};
 // Giữ manifest trước khi xóa; bản backup/báo cáo không được tính là tham chiếu đang dùng.
 await fs.writeFile(report,JSON.stringify(manifest,null,2),{flag:'wx'});
 if(apply&&unused.length){
  const latest=await references();
  for(const file of unused){
   if(latest.some(text=>text.includes(file.name.toLowerCase()))){manifest.skipped.push({name:file.name,reason:'Đã được tham chiếu'});continue;}
   const target=path.join(folder,file.name),stat=await fs.lstat(target);
   if(!stat.isFile()||stat.size!==file.bytes||stat.mtime.toISOString()!==file.modifiedAt){manifest.skipped.push({name:file.name,reason:'File đã thay đổi sau khi kiểm tra'});continue;}
   await fs.unlink(target);manifest.deleted.push(file.name);await fs.writeFile(report,JSON.stringify(manifest,null,2));
  }
 }
 await fs.writeFile(report,JSON.stringify(manifest,null,2));
 console.log(JSON.stringify({mode:manifest.mode,totalFiles:files.length,referencedFiles:manifest.referenced,unused:unused.map(file=>({name:file.name,bytes:file.bytes})),deleted:manifest.deleted,skipped:manifest.skipped,report:path.relative(root,report)},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>db.end());
