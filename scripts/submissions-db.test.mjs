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
