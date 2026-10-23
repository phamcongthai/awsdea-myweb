-- Run after schema.sql and leaderboard.sql. Preserves DEA progress and profiles.
begin;
create table if not exists public.quest_certificate_scores (
 user_id uuid references auth.users(id) on delete cascade,
 certificate text check(certificate in ('saa','clf')),
 points integer not null default 0,
 stats jsonb not null default '{}'::jsonb,
 primary key(user_id,certificate)
);
alter table public.quest_certificate_scores enable row level security;
revoke all on public.quest_certificate_scores from public,anon,authenticated;

create or replace function public.quest_cert_stats(p jsonb,c text) returns jsonb
language plpgsql immutable set search_path='' as $$
declare practice jsonb:=public.quest_json(p->>('cert:'||c||':aws-data-quest-v1'));
 exams jsonb:=public.quest_json(p->>('cert:'||c||':aws-realtest-v1'));
 n integer:=0; m integer:=0; ep integer:=0; hc integer:=0; uh integer:=0;
begin
 if c not in ('saa','clf') then raise exception 'Invalid certificate'; end if;
 if jsonb_typeof(practice->'progress')='object' then
  select count(*) filter(where value->'correct'='true'::jsonb),
   count(*) filter(where value->'correct'='true'::jsonb and value->'certain'='true'::jsonb and public.quest_int(value->'streak')>=2)
  into n,m from jsonb_each(practice->'progress')
  where key ~ '^[1-6]-([1-9]|[1-5][0-9]|6[0-5])$'
   and (c<>'clf' or split_part(key,'-',1)<>'1' or
    case when key ~ '^1-[0-9]{1,2}$' then split_part(key,'-',2)::integer<=15 else false end);
 end if;
 if jsonb_typeof(exams->'history')='array' then
  with runs as (
   select value as h,case when c='clf' and public.quest_int(value->'test')=1 then 15 else 65 end as total
   from jsonb_array_elements(exams->'history')
   where public.quest_int(value->'test') between 1 and 6 and jsonb_typeof(value->'ended')='number'
  ), valid as(select * from runs where public.quest_int(h->'score')<=total),
  per_test as (
   select public.quest_int(h->'test') as test,
    coalesce(max(public.quest_int(h->'score')) filter(where coalesce(h->>'mode','timed')='timed'),0) as best,
    bool_or(h->>'mode'='hardcore' and public.quest_int(h->'score')=total and h->>'reason' is distinct from 'timeout') as hc,
    bool_or(h->>'mode'='ultra' and public.quest_int(h->'score')=total and h->>'reason' is distinct from 'timeout') as uh
   from valid group by public.quest_int(h->'test')
  ) select coalesce(sum(best*4),0),count(*) filter(where per_test.hc),count(*) filter(where per_test.uh)
   into ep,hc,uh from per_test;
 end if;
 return jsonb_build_object('correct',n,'mastered',m,'exam_points',ep,'hardcore',hc,'ultra',uh,
  'points',n*10+m*15+ep+hc*300+uh*800);
end; $$;

create or replace function public.refresh_quest_cert_rank() returns trigger
language plpgsql security definer set search_path='' as $$
declare c text; s jsonb;
begin
 foreach c in array array['saa','clf'] loop
  s:=public.quest_cert_stats(new.payload,c);
  insert into public.quest_certificate_scores(user_id,certificate,points,stats)
   values(new.user_id,c,(s->>'points')::integer,s)
   on conflict(user_id,certificate) do update set points=excluded.points,stats=excluded.stats;
 end loop;
 return new;
end; $$;
drop trigger if exists quest_cert_rank_refresh on public.quest_learning_state;
create trigger quest_cert_rank_refresh after insert or update of payload on public.quest_learning_state
 for each row execute function public.refresh_quest_cert_rank();
insert into public.quest_certificate_scores(user_id,certificate,points,stats)
 select l.user_id,c,(s->>'points')::integer,s from public.quest_learning_state l
 cross join unnest(array['saa','clf']) c
 cross join lateral (select public.quest_cert_stats(l.payload,c) s) v
 on conflict(user_id,certificate) do update set points=excluded.points,stats=excluded.stats;

create or replace function public.get_quest_leaderboard(p_cert text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_cert='dea' then return public.get_quest_leaderboard(); end if;
 if p_cert is null or p_cert not in ('saa','clf') then raise exception 'Invalid certificate'; end if;
 insert into public.quest_profiles(user_id) values(auth.uid()) on conflict do nothing;
 insert into public.quest_certificate_scores(user_id,certificate) values(auth.uid(),p_cert) on conflict do nothing;
 with ranked as (
  select p.display_name,p.avatar_id,s.points,s.stats,s.user_id=auth.uid() as is_me,
   rank() over(order by s.points desc) as position,s.user_id as sort_id
  from public.quest_certificate_scores s join public.quest_profiles p using(user_id) where s.certificate=p_cert
 ), top_rows as (
  select display_name,avatar_id,points,stats,is_me,position from ranked order by points desc,display_name,sort_id limit 100
 ) select jsonb_build_object('leaders',coalesce((select jsonb_agg(t) from top_rows t),'[]'::jsonb),
  'me',(select to_jsonb(r)-'sort_id' from ranked r where is_me),'total',(select count(*) from ranked)) into result;
 return result;
end; $$;
revoke all on function public.quest_cert_stats(jsonb,text),public.refresh_quest_cert_rank(),public.get_quest_leaderboard(text) from public,anon,authenticated;
grant execute on function public.get_quest_leaderboard(text) to authenticated;
commit;
