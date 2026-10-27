import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright';

const folder='DOJOS/Sections/TIME_MODE/hehebonus';
const source=folder+'/Review Mode Diagnostic Test - AWS Certified Data Engineer Associate - Tutorials Dojo.html';
const html=fs.readFileSync(source,'utf8');
const bases=[5,6,7,8].map(id=>JSON.parse(fs.readFileSync(`exam-bank/test${id}.json`,'utf8')));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let questions;
try {
 const page=await browser.newPage();
 questions=await page.evaluate(({html,bases})=>{
  const parse=h=>new DOMParser().parseFromString(h,'text/html');
  const key=h=>(parse(h).body.textContent.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).join(' ');
  const seen=new Set(bases.flatMap(b=>b.questions.map(q=>key(q.question))));
  const clean=node=>{const el=node.cloneNode(true);el.querySelectorAll('script,style,input,button,svg,.input-style').forEach(n=>n.remove());for(const n of el.querySelectorAll('*'))for(const a of [...n.attributes])if(!['src','href','alt','colspan','rowspan'].includes(a.name))n.removeAttribute(a.name);return el.innerHTML.trim();};
  return [...parse(html).querySelectorAll('.wpProQuiz_listItem')].flatMap((el,index)=>{
   const question=clean(el.querySelector('.wpProQuiz_question_text')),fingerprint=key(question);
   if(seen.has(fingerprint))return [];seen.add(fingerprint);
   const options=[...el.querySelectorAll('.wpProQuiz_questionListItem')];
   const feedback=[...el.querySelectorAll('.wpProQuiz_correct,.wpProQuiz_incorrect')].sort((a,b)=>b.textContent.length-a.textContent.length)[0].cloneNode(true);
   feedback.querySelector(':scope > span')?.remove();
   return [{sourceNumber:index+1,sourceId:JSON.parse(el.dataset.questionMeta).question_pro_id,section:'Dojo Bonus - Diagnostic',question,answers:options.map(o=>clean(o.querySelector('label'))),correct:options.flatMap((o,i)=>o.classList.contains('wpProQuiz_answerCorrect')||o.classList.contains('wpProQuiz_answerCorrectIncomplete')?[i]:[]),explanation:clean(feedback)}];
  });
 },{html,bases});
} finally {await browser.close();}
if(JSON.stringify(questions.map(q=>q.sourceNumber))!=='[1,2,4,5,7,9]')throw Error('Unexpected bonus questions');
function images(html){return html.replace(/<img\b[^>]*>/gi,tag=>{const src=tag.match(/src="([^"]+)"/)?.[1];if(!src)return ''; // Empty image placeholder in the saved source.
const file=path.resolve(folder,decodeURIComponent(src.replaceAll('&amp;','&')));if(!file.startsWith(path.resolve(folder)+path.sep))throw Error('Image outside source');const bytes=fs.readFileSync(file),ext=path.extname(file).toLowerCase();if(!['.jpg','.jpeg','.png','.gif','.webp'].includes(ext))throw Error('Unsupported image');const name=crypto.createHash('sha256').update(bytes).digest('hex')+ext;fs.writeFileSync('exam-bank/assets/'+name,bytes);return tag.replace(src,'exams/assets/'+name);});}
questions=questions.map((q,i)=>{if(!q.correct.length||q.correct.length>=q.answers.length||!q.explanation)throw Error('Incomplete question');return {id:i+1,...q,question:images(q.question),answers:q.answers.map(images),explanation:images(q.explanation)};});
const test={id:9,title:'Dojo Bonus \u00b7 6 c\u00e2u m\u1edbi',provider:'Tutorials Dojo',source,minutes:12,supplementary:true,questions};
fs.writeFileSync('exam-bank/test9.json',JSON.stringify(test));
const manifest=JSON.parse(fs.readFileSync('exam-bank/manifest.json','utf8')).filter(t=>t.id!==9);
manifest.push({id:9,title:test.title,minutes:test.minutes,count:6,supplementary:true});
fs.writeFileSync('exam-bank/manifest.json',JSON.stringify(manifest));
console.log('Imported Dojo Bonus: 6 unique questions, source 1,2,4,5,7,9; 12 minutes.');

