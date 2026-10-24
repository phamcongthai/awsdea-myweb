-- Run once in Supabase SQL Editor. Does not change existing notebook text/progress.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('quest-notebook-images','quest-notebook-images',false,2097152,array['image/webp','image/jpeg','image/png'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists quest_notebook_image_read on storage.objects;
create policy quest_notebook_image_read on storage.objects for select to authenticated
 using(bucket_id='quest-notebook-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists quest_notebook_image_insert on storage.objects;
create policy quest_notebook_image_insert on storage.objects for insert to authenticated
 with check(bucket_id='quest-notebook-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists quest_notebook_image_delete on storage.objects;
create policy quest_notebook_image_delete on storage.objects for delete to authenticated
 using(bucket_id='quest-notebook-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
