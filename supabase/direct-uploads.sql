-- Apply after submissions.sql, including on existing installations.
-- Re-runnable migration: no tables, submissions, or private credentials are removed.
begin;

alter table public.submissions drop constraint if exists submissions_status_check;
alter table public.submissions add constraint submissions_status_check
  check (status in ('uploading','queued','reviewing','needs_review','rejected','failed','published'));

create or replace function public.reserve_submission(payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(847214);
  update submissions set status='failed', feedback='Upload expired. Submit the ZIP again.'
    where status='uploading' and created_at<now()-interval '1 hour';
  if (select count(*) from submissions where ip_hash = payload->>'ip_hash' and created_at > now() - interval '1 hour') >= 3
    or (select count(*) from submissions where created_at > now() - interval '1 day') >= 100
    or (select count(*) from submissions where status in ('uploading','queued','reviewing','needs_review')) >= 500 then
    raise exception 'submission_rate_limit';
  end if;
  insert into submissions(id,title,author,category,tools,slug,blob_path,archive_sha256,status_token_hash,ip_hash)
  values ((payload->>'id')::uuid,payload->>'title',payload->>'author',payload->>'category',
    payload->'tools',payload->>'slug',payload->>'blob_path',payload->>'archive_sha256',
    payload->>'status_token_hash',payload->>'ip_hash');
end;
$$;

create or replace function public.reserve_submission_upload(payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Reservation and the uploading state are committed atomically.
  perform reserve_submission(payload);
  update submissions set status='uploading', feedback='Waiting for the ZIP upload and archive checks.'
    where id=(payload->>'id')::uuid;
end;
$$;

create or replace function public.complete_submission_upload(submission_id uuid, credential_hash text, checksum text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if checksum !~ '^[0-9a-f]{64}$' or checksum is null then
    raise exception 'Invalid archive checksum';
  end if;
  perform 1 from submissions
    where id=submission_id and status_token_hash=credential_hash for update;
  if not found then raise exception 'Upload not found'; end if;
  -- A retry after a lost response must not requeue an already claimed/reviewed submission.
  if exists (select 1 from submissions where id=submission_id
    and status<>'uploading' and archive_sha256=checksum) then return; end if;
  update submissions set status='queued', archive_sha256=checksum,
    feedback='ZIP received. Waiting for the review worker.'
    where id=submission_id and status='uploading'
      and created_at>now()-interval '30 minutes';
  if not found then raise exception 'Upload expired or was already closed'; end if;
end;
$$;

revoke all on function public.reserve_submission(jsonb) from public, anon, authenticated;
revoke all on function public.reserve_submission_upload(jsonb) from public, anon, authenticated;
revoke all on function public.complete_submission_upload(uuid,text,text) from public, anon, authenticated;
grant execute on function public.reserve_submission(jsonb) to service_role;
grant execute on function public.reserve_submission_upload(jsonb) to service_role;
grant execute on function public.complete_submission_upload(uuid,text,text) to service_role;

commit;
