-- Run AFTER schema.sql. Safe to rerun; does not reset learning data.
begin;
create table if not exists public.quest_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Nhà thám hiểm' check (char_length(display_name) between 2 and 32),
 avatar_id integer not null default 1 check (avatar_id between 1 and 12),
 points integer not null default 0,
 stats jsonb not null default '{}'::jsonb
);
alter table public.quest_profiles enable row level security;
revoke all on public.quest_profiles from anon, authenticated;
-- Only RPC exposes safe fields, never email, notes, answers or raw progress.
create or replace function public.quest_json(v text) returns jsonb language plpgsql immutable set search_path='' as $$
begin return coalesce(v::jsonb,'{}'::jsonb); exception when others then return '{}'::jsonb; end; $$;
create or replace function public.quest_int(v jsonb) returns integer language sql immutable set search_path='' as $$
 select case when v::text ~ '^[0-9]{1,8}$' then (v::text)::integer else 0 end;
$$;
create or replace function public.quest_rank_stats(p jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare practice jsonb:=public.quest_json(p->>'aws-data-quest-v1'); exams jsonb:=public.quest_json(p->>'aws-realtest-v1');
 correct_count integer:=0; mastered integer:=0; exam_points integer:=0; hc integer:=0; ultra integer:=0;
begin
 if jsonb_typeof(practice->'progress')='object' then
  select count(*) filter(where value->'correct'='true'::jsonb),
   count(*) filter(where value->'correct'='true'::jsonb and value->'certain'='true'::jsonb and public.quest_int(value->'streak')>=2)
  into correct_count,mastered from jsonb_each(practice->'progress')
  where key ~ '^[1-4]-([1-9]|[1-5][0-9]|6[0-5])$';
 end if;
 if jsonb_typeof(exams->'history')='array' then
  with runs as (select value as h from jsonb_array_elements(exams->'history')
   where public.quest_int(value->'test') between 1 and 5 and public.quest_int(value->'score')<=65
   and jsonb_typeof(value->'ended')='number'), per_test as (
   select public.quest_int(h->'test') as test,
    coalesce(max(public.quest_int(h->'score')) filter(where coalesce(h->>'mode','timed')='timed'),0) as best,
    bool_or(h->>'mode'='hardcore' and public.quest_int(h->'score')=65 and h->>'reason' is distinct from 'timeout') as hc,
    bool_or(h->>'mode'='ultra' and public.quest_int(h->'score')=65 and h->>'reason' is distinct from 'timeout') as ultra
   from runs group by public.quest_int(h->'test'))
  select coalesce(sum(best*4),0),count(*) filter(where per_test.hc),count(*) filter(where per_test.ultra)
   into exam_points,hc,ultra from per_test;
 end if;
 return jsonb_build_object('correct',correct_count,'mastered',mastered,'exam_points',exam_points,'hardcore',hc,'ultra',ultra,
 'points',correct_count*10+mastered*15+exam_points+hc*300+ultra*800);
end; $$;
create or replace function public.refresh_quest_rank() returns trigger language plpgsql security definer set search_path='' as $$
declare s jsonb:=public.quest_rank_stats(new.payload);
begin
 insert into public.quest_profiles(user_id,points,stats) values(new.user_id,(s->>'points')::integer,s)
 on conflict(user_id) do update set points=excluded.points,stats=excluded.stats;
 return new;
end; $$;
drop trigger if exists quest_rank_refresh on public.quest_learning_state;
create trigger quest_rank_refresh after insert or update of payload on public.quest_learning_state
 for each row execute function public.refresh_quest_rank();
insert into public.quest_profiles(user_id,points,stats)
 select user_id,(public.quest_rank_stats(payload)->>'points')::integer,public.quest_rank_stats(payload) from public.quest_learning_state
 on conflict(user_id) do update set points=excluded.points,stats=excluded.stats;

create or replace function public.save_quest_profile(p_name text,p_avatar integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 2 and 32 or p_name ~ '[[:cntrl:]]' or p_avatar is null or p_avatar not between 1 and 12 then
  raise exception 'Tên cần 2–32 ký tự và avatar hợp lệ.' using errcode='22023'; end if;
 insert into public.quest_profiles(user_id,display_name,avatar_id) values(auth.uid(),btrim(p_name),p_avatar)
 on conflict(user_id) do update set display_name=excluded.display_name,avatar_id=excluded.avatar_id;
end; $$;
create or replace function public.get_quest_leaderboard() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 insert into public.quest_profiles(user_id) values(auth.uid()) on conflict do nothing;
 with ranked as (select display_name,avatar_id,points,stats,user_id=auth.uid() as is_me,
  rank() over(order by points desc) as position, user_id as sort_id from public.quest_profiles),
 top_rows as (select display_name,avatar_id,points,stats,is_me,position from ranked order by points desc,display_name,sort_id limit 100)
 select jsonb_build_object('leaders',coalesce((select jsonb_agg(t) from top_rows t),'[]'::jsonb),
  'me',(select to_jsonb(r)-'sort_id' from ranked r where is_me), 'total',(select count(*) from ranked)) into result;
 return result;
end; $$;
revoke all on function public.quest_json(text),public.quest_int(jsonb),public.quest_rank_stats(jsonb),public.refresh_quest_rank(),public.save_quest_profile(text,integer),public.get_quest_leaderboard() from public, anon, authenticated;
grant execute on function public.save_quest_profile(text,integer),public.get_quest_leaderboard() to authenticated;
commit;
