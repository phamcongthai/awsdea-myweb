import {pathToFileURL} from 'node:url';import path from 'node:path';const {PGlite}=await import(process.env.QUEST_PGLITE_MODULE?pathToFileURL(path.join(process.env.QUEST_PGLITE_MODULE,'dist/index.js')).href:'@electric-sql/pglite');import fs from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;`);
for(const f of ['schema','leaderboard','multi-cert'])await db.exec(fs.readFileSync('supabase/'+f+'.sql','utf8'));
await db.exec(fs.readFileSync('supabase/multi-cert.sql','utf8')); // idempotent
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';await db.query('insert into auth.users values($1),($2)',[a,b]);await db.query("select set_config('test.uid',$1,false)",[a]);
const progress={'1-1':{correct:true,certain:true,streak:2},'1-16':{correct:true},'6-65':{correct:true},'bad-id':{correct:true}};
const exams={history:[{test:1,score:15,mode:'timed',ended:1},{test:1,score:65,mode:'timed',ended:2},{test:1,score:15,mode:'hardcore',ended:3},{test:1,score:15,mode:'hardcore',ended:4},{test:2,score:65,mode:'ultra',ended:5},{test:3,score:65,mode:'review',ended:6}]};
const payload={'aws-data-quest-v1':JSON.stringify({progress:{'1-1':{correct:true}}}),'cert:clf:aws-data-quest-v1':JSON.stringify({progress}),'cert:clf:aws-realtest-v1':JSON.stringify(exams)};
await db.query('select public.save_quest_learning_state($1,0)',[payload]);
let board=(await db.query("select public.get_quest_leaderboard('clf') b")).rows[0].b;assert.equal(board.me.points,1195);assert.equal(board.me.stats.correct,2);assert.equal(board.me.stats.hardcore,1);assert.equal(board.me.stats.ultra,1);assert.equal(board.me.stats.exam_points,60);
assert.equal((await db.query("select public.get_quest_leaderboard('saa') b")).rows[0].b.me.points,0);
assert.equal((await db.query('select public.get_quest_leaderboard() b')).rows[0].b.me.points,10);
await db.query("select set_config('test.uid',$1,false)",[b]);await db.query('select public.save_quest_learning_state($1,0)',[{}]);board=(await db.query("select public.get_quest_leaderboard('clf') b")).rows[0].b;assert.equal(board.me.points,0);assert.equal(board.me.position,2);assert.equal(board.leaders[0].points,1195);assert.ok(!JSON.stringify(board).includes('user_id'));
await db.exec('set role authenticated');assert.equal((await db.query("select public.get_quest_leaderboard('clf') b")).rows[0].b.me.points,0);await assert.rejects(db.query('select * from public.quest_certificate_scores'));await db.exec('reset role');
await db.query("select set_config('test.uid','',false)");await assert.rejects(db.query("select public.get_quest_leaderboard('clf')"));await db.close();console.log('PASS PostgreSQL migrations rerun, per-certificate rank, diagnostic 15 vs 65, dedup awards, DEA preserved, safe RPC, denied direct reads/anonymous');
