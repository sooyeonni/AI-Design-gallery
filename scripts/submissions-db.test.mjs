import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("submission database enforces quotas, leases, status gates and private access", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role;");
    await db.exec(await readFile(new URL("../supabase/submissions.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/direct-uploads.sql", import.meta.url), "utf8"));
    const reserve = async (ip) => {
      const id = randomUUID();
      await db.query("select reserve_submission($1::jsonb)", [JSON.stringify({
        id, title: "Example", author: "Soo", category: "Slides", tools: ["Claude"], slug: `example-${id}`,
        blob_path: `submissions/${id}/project.zip`, archive_sha256: "hash", status_token_hash: "private", ip_hash: ip,
      })]);
      return id;
    };
    const first = await reserve("same-ip");
    await reserve("same-ip");
    await reserve("same-ip");
    await assert.rejects(reserve("same-ip"), /submission_rate_limit/);
    const { rows: [claimed] } = await db.query("select * from claim_submission()");
    assert.equal(claimed.id, first);
    assert.equal(claimed.status, "reviewing");
    assert.ok(claimed.lease_token);
    await assert.rejects(db.query("select finish_submission($1,$2,'published','ok','https://test.vercel.app')", [first, randomUUID()]), /lease/);
    await assert.rejects(db.query("select finish_submission($1,$2,'published','ok',null)", [first, claimed.lease_token]));
    await assert.rejects(db.query("select finish_submission($1,$2,'published','ok','https://evil.example')", [first, claimed.lease_token]));
    await db.query("select finish_submission($1,$2,'published','ok','https://test.vercel.app')", [first, claimed.lease_token]);
    const { rows: [published] } = await db.query("select status, deployment_url, lease_token from submissions where id=$1", [first]);
    assert.equal(published.status, "published");
    assert.equal(published.lease_token, null);
    const { rows: [second] } = await db.query("select * from claim_submission()");
    assert.notEqual(second.id, first);
    await db.query("update submissions set lease_expires_at = now() - interval '1 minute', attempts=3 where id=$1", [second.id]);
    await db.query("select * from claim_submission()");
    const { rows: [expired] } = await db.query("select status from submissions where id=$1", [second.id]);
    assert.equal(expired.status, "failed");
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from submissions"), /permission denied/);
    await assert.rejects(db.query("select * from claim_submission()"), /permission denied/);
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});

test("direct-upload migration is re-runnable, reserves quota before upload, and gates completion", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role;");
    await db.exec(await readFile(new URL("../supabase/submissions.sql", import.meta.url), "utf8"));
    const migration = await readFile(new URL("../supabase/direct-uploads.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    const reserve = async (ip) => {
      const id = randomUUID();
      await db.query("select reserve_submission_upload($1::jsonb)", [JSON.stringify({
        id, title: "Camera app", author: "Soo", category: "Tool", tools: ["Claude"], slug: `camera-${id}`,
        blob_path: `submissions/${id}/project.zip`, archive_sha256: "", status_token_hash: "private", ip_hash: ip,
      })]);
      return id;
    };
    const first = await reserve("same-ip");
    await reserve("same-ip");
    await reserve("same-ip");
    await assert.rejects(reserve("same-ip"), /submission_rate_limit/);
    assert.equal((await db.query("select * from claim_submission()")).rows.length, 0);
    const checksum = "a".repeat(64);
    await assert.rejects(db.query("select complete_submission_upload($1,'wrong',$2)", [first, checksum]), /not found/);
    await assert.rejects(db.query("select complete_submission_upload($1,'private','invalid')", [first]), /checksum/);
    await db.exec("set role anon");
    await assert.rejects(db.query("select reserve_submission_upload('{}')"), /permission denied/);
    await assert.rejects(db.query("select complete_submission_upload($1,'private',$2)", [first, checksum]), /permission denied/);
    await db.exec("reset role");
    await db.query("select complete_submission_upload($1,'private',$2)", [first, checksum]);
    const { rows: [claimed] } = await db.query("select * from claim_submission()");
    assert.equal(claimed.id, first);
    assert.equal(claimed.archive_sha256, checksum);
    await db.query("select complete_submission_upload($1,'private',$2)", [first, checksum]);
    const { rows: [retried] } = await db.query("select status, lease_token from submissions where id=$1", [first]);
    assert.equal(retried.status, "reviewing");
    assert.equal(retried.lease_token, claimed.lease_token);
    const expired = await reserve("other-ip");
    await db.query("update submissions set created_at=now()-interval '31 minutes' where id=$1", [expired]);
    await assert.rejects(db.query("select complete_submission_upload($1,'private',$2)", [expired, checksum]), /expired/);
    await db.query("update submissions set created_at=now()-interval '61 minutes' where id=$1", [expired]);
    await reserve("another-ip");
    assert.equal((await db.query("select status from submissions where id=$1", [expired])).rows[0].status, "failed");
  } finally {
    await db.close();
  }
});
