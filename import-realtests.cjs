const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const input=path.join(__dirname,'realtest/Tests'),out=path.join(__dirname,'exam-bank');
fs.mkdirSync(path.join(out,'assets'),{recursive:true});
const files=fs.readdirSync(input).filter(f=>/^00\d.*\.html$/.test(f)).sort();
if(files.length!==4)throw Error('Expected four tests');
const manifest=[];
files.forEach((file,i)=>{
 const html=fs.readFileSync(path.join(input,file),'utf8');
 const data=JSON.parse(html.match(/<script id="quiz-data-script" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 const extract=s=>s.replace(/data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=\r\n]+)/g,(_,type,b64)=>{
  const bytes=Buffer.from(b64,'base64'),name=crypto.createHash('sha256').update(bytes).digest('hex')+'.'+(type==='jpeg'?'jpg':type);
  fs.writeFileSync(path.join(out,'assets',name),bytes);return 'exams/assets/'+name;
 });
 const questions=data.assessments.map((q,j)=>({id:j+1,section:q.section,question:extract(q.prompt.question),answers:q.prompt.answers.map(extract),correct:q.correct_response.map(c=>c.charCodeAt(0)-97),explanation:extract(q.prompt.explanation)}));
 if(questions.length!==65||questions.some(q=>!q.correct.length||q.correct.some(n=>n<0||n>=q.answers.length)))throw Error('Invalid data');
 const test={id:i+1,title:'Đề kiểm tra '+(i+1),minutes:120,questions};
 fs.writeFileSync(path.join(out,'test'+test.id+'.json'),JSON.stringify(test));
 manifest.push({id:test.id,title:test.title,minutes:test.minutes,count:questions.length});
 console.log('Imported',file,questions.length,'questions');
});
for(const file of fs.readdirSync(out).filter(f=>/^test[5-9]\d*\.json$/.test(f))){const t=JSON.parse(fs.readFileSync(path.join(out,file),'utf8'));manifest.push({id:t.id,title:t.title,minutes:t.minutes,count:t.questions.length});}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest));
console.log('Unique images:',fs.readdirSync(path.join(out,'assets')).length);
