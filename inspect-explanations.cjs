global.window={};require('./quest-data.js');
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const test=Number(process.argv[2]||1),from=Number(process.argv[3]||1),to=Number(process.argv[4]||65);
for(const q of window.QUEST_BANK.questions.filter(q=>q.test===test&&q.number>=from&&q.number<=to)){
 console.log('\n'+q.id+' Q: '+text(q.question).slice(0,450));
 q.answers.forEach((a,i)=>console.log(i+(q.correct.includes(i)?' CORRECT ':' WRONG ')+text(a)));
 const wrong=q.explanation.split(/Incorrect options?:?/i)[1];
 if(wrong)console.log('WHY: '+text(wrong.split(/References?:/i)[0]).slice(0,700));
}
