import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright';

const root=process.cwd(),folder=path.join(root,'DOJOS');
const files=fs.readdirSync(folder).filter(f=>f.endsWith('.html'));
if(files.length!==1)throw Error('Expected one saved Tutorials Dojo HTML in DOJOS');
const html=fs.readFileSync(path.join(folder,files[0]),'utf8');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let data;
try{const page=await browser.newPage();data=await page.evaluate(source=>{
 const doc=new DOMParser().parseFromString(source,'text/html');
 const categories=Object.fromEntries([...doc.querySelectorAll('[data-category_id]')].map(el=>[el.dataset.category_id,el.querySelector('.wpProQuiz_catName')?.textContent.trim()]));
 const quiz=JSON.parse(source.match(/json:\s*(\{"\d+":\{[\s\S]*?\})\s*,\s*\n/)?.[1]||'{}');
 function clean(node){const el=node.cloneNode(true);el.querySelectorAll('script,style,input,button,svg,.input-style').forEach(n=>n.remove());for(const n of el.querySelectorAll('*'))for(const a of [...n.attributes])if(!['src','href','alt','colspan','rowspan'].includes(a.name))n.removeAttribute(a.name);return el.innerHTML.trim();}
 const questions=[...doc.querySelectorAll('.wpProQuiz_listItem')].map((el,i)=>{
  const options=[...el.querySelectorAll('.wpProQuiz_questionListItem')];
  const correct=options.flatMap((n,j)=>n.classList.contains('wpProQuiz_answerCorrect')||n.classList.contains('wpProQuiz_answerCorrectIncomplete')?[j]:[]);
  const feedback=[...el.querySelectorAll('.wpProQuiz_correct,.wpProQuiz_incorrect')].sort((a,b)=>b.textContent.length-a.textContent.length)[0]?.cloneNode(true);
  if(!feedback)throw Error('Missing explanation '+(i+1));
  feedback.querySelector(':scope > span')?.remove();
  const sourceId=JSON.parse(el.dataset.questionMeta).question_pro_id;
  const section=categories[quiz[sourceId]?.catId];if(!section)throw Error('Missing category '+sourceId);
  return {id:i+1,sourceId,section,question:clean(el.querySelector('.wpProQuiz_question_text')),answers:options.map(n=>clean(n.querySelector('label'))),correct,explanation:clean(feedback)};
 });
 return {minutes:Number(source.match(/timelimit:\s*(\d+)/)?.[1])/60,questions};
},html);}finally{await browser.close();}
if(data.questions.length!==65||data.minutes!==130)throw Error('Unexpected source count or duration');
const assets=path.join(root,'exam-bank/assets');fs.mkdirSync(assets,{recursive:true});
function packageImages(value){return value.replace(/<img\b[^>]*>/gi,tag=>{const match=tag.match(/src="([^"]+)"/);if(!match)throw Error('Image has no source');const local=path.resolve(folder,decodeURIComponent(match[1].replaceAll('&amp;','&')));if(!local.startsWith(folder+path.sep))throw Error('Image outside DOJOS');const bytes=fs.readFileSync(local),ext=path.extname(local).toLowerCase().replace('.jpeg','.jpg');if(!['.jpg','.png','.gif','.webp'].includes(ext))throw Error('Unsupported image '+ext);const file=crypto.createHash('sha256').update(bytes).digest('hex')+ext;fs.writeFileSync(path.join(assets,file),bytes);return tag.replace(match[1],'exams/assets/'+file);});}
for(const q of data.questions){if(!q.question||q.answers.length<2||!q.correct.length||q.correct.length>=q.answers.length||!q.explanation)throw Error('Incomplete question '+q.id);q.question=packageImages(q.question);q.answers=q.answers.map(packageImages);q.explanation=packageImages(q.explanation);}
const test={id:5,title:'Đề 5 · Tutorials Dojo',provider:'Tutorials Dojo',source:files[0],minutes:data.minutes,questions:data.questions};
fs.writeFileSync('exam-bank/test5.json',JSON.stringify(test));
const manifest=JSON.parse(fs.readFileSync('exam-bank/manifest.json','utf8')).filter(t=>t.id!==5);manifest.push({id:5,title:test.title,minutes:test.minutes,count:test.questions.length});fs.writeFileSync('exam-bank/manifest.json',JSON.stringify(manifest));
console.log(JSON.stringify({test:5,questions:test.questions.length,minutes:test.minutes,multipleChoice:test.questions.filter(q=>q.correct.length>1).length,images:new Set(test.questions.flatMap(q=>[q.question,...q.answers,q.explanation]).join('').match(/exams\/assets\/[^" ]+/g)).size}));
