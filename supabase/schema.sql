-- Run once in Supabase > SQL Editor. No service_role key is needed by the website.
begin;
create table if not exists public.quest_learning_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.quest_learning_state enable row level security;
revoke all on public.quest_learning_state from anon, authenticated;
grant select on public.quest_learning_state to authenticated;
drop policy if exists quest_owner_read on public.quest_learning_state;
create policy quest_owner_read on public.quest_learning_state for select to authenticated
 using (user_id = (select auth.uid()));

create or replace function public.save_quest_learning_state(p_payload jsonb, p_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); saved public.quest_learning_state;
begin
 if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if p_revision is null or p_revision < 0 or jsonb_typeof(p_payload) is distinct from 'object'
 or octet_length(p_payload::text) > 3000000 then
  raise exception 'Invalid learning data' using errcode = '22023';
 end if;
 if p_revision = 0 then
  insert into public.quest_learning_state(user_id,payload) values(owner_id,p_payload)
  on conflict(user_id) do nothing returning * into saved;
 else
  update public.quest_learning_state set payload=p_payload,revision=revision+1,updated_at=now()
   where user_id=owner_id and revision=p_revision returning * into saved;
 end if;
 if saved.user_id is null then raise exception 'Revision conflict' using errcode = '40001'; end if;
 return jsonb_build_object('payload',saved.payload,'revision',saved.revision,'updated_at',saved.updated_at);
end; $$;
revoke all on function public.save_quest_learning_state(jsonb,bigint) from public, anon;
grant execute on function public.save_quest_learning_state(jsonb,bigint) to authenticated;
commit;
