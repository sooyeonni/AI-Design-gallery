-- Apply once through the Supabase SQL editor. No public client has table access.
create table public.submissions (
  id uuid primary key,
  title text not null,
  author text not null,
  category text not null check (category in ('Slides','Prototype','Experiment','Tool','Other')),
  tools jsonb not null,
  slug text not null unique,
  status text not null default 'queued' check (status in ('queued','reviewing','needs_review','rejected','failed','published')),
  feedback text not null default 'ZIP received. Waiting for the review worker.',
  blob_path text not null,
  archive_sha256 text not null,
  status_token_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  deployment_url text,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempts integer not null default 0,
  check (status <> 'published' or (deployment_url is not null and deployment_url ~ '^https://[a-z0-9-]+\.vercel\.app/?$'))
);
alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
grant select, insert, update, delete on public.submissions to service_role;
create index submissions_queue on public.submissions(status, created_at);
create index submissions_ip on public.submissions(ip_hash, created_at);

create function public.reserve_submission(payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Serialize reservations so concurrent uploads cannot bypass the limits.
  perform pg_advisory_xact_lock(847214);
  if (select count(*) from submissions where ip_hash = payload->>'ip_hash' and created_at > now() - interval '1 hour') >= 3
    or (select count(*) from submissions where created_at > now() - interval '1 day') >= 100
    or (select count(*) from submissions where status in ('queued','reviewing','needs_review')) >= 500 then
    raise exception 'submission_rate_limit';
  end if;
  insert into submissions(id,title,author,category,tools,slug,blob_path,archive_sha256,status_token_hash,ip_hash)
  values ((payload->>'id')::uuid,payload->>'title',payload->>'author',payload->>'category',
    payload->'tools',payload->>'slug',payload->>'blob_path',payload->>'archive_sha256',
    payload->>'status_token_hash',payload->>'ip_hash');
end;
$$;

create function public.claim_submission() returns setof public.submissions
language plpgsql security definer set search_path = public as $$
begin
  update submissions set status='failed', feedback='Review worker stopped repeatedly. Contact the organizer to retry.',
    lease_token=null, lease_expires_at=null
    where status='reviewing' and lease_expires_at < now() and attempts >= 3;
  return query
    update submissions set status='reviewing', feedback='Checking your ZIP and reviewing the static export.',
      attempts=attempts+1, lease_token=gen_random_uuid(), lease_expires_at=now()+interval '15 minutes'
    where id = (select id from submissions
      where status='queued' or (status='reviewing' and lease_expires_at < now() and attempts < 3)
      order by created_at for update skip locked limit 1)
    returning *;
end;
$$;

create function public.finish_submission(submission_id uuid, lease uuid, next_status text, message text, url text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if next_status not in ('needs_review','rejected','failed','published') then
    raise exception 'Invalid terminal state';
  end if;
  update submissions set status=next_status, feedback=left(message,1000), deployment_url=url,
    lease_token=null, lease_expires_at=null
    where id=submission_id and status='reviewing' and lease_token=lease and lease_expires_at>now();
  if not found then raise exception 'Submission lease expired or was replaced'; end if;
end;
$$;
revoke all on function public.reserve_submission(jsonb) from public, anon, authenticated;
revoke all on function public.claim_submission() from public, anon, authenticated;
revoke all on function public.finish_submission(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.reserve_submission(jsonb) to service_role;
grant execute on function public.claim_submission() to service_role;
grant execute on function public.finish_submission(uuid,uuid,text,text,text) to service_role;
