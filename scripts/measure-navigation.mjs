// Read-only HTTP benchmark. Existing account credentials arrive through stdin.
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import assert from "node:assert/strict";

const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
const credentials = await new Promise(resolve => { let text = ""; process.stdin.on("data", chunk => { text += chunk; try { const parsed = JSON.parse(text); process.stdin.pause(); if (process.stdin.isTTY) process.stdin.setRawMode(false); resolve(parsed); } catch { /* Await complete JSON. */ } }); });
const jar = new Map();
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(({ name, value }) => jar.set(name, value)) } });
const login = await supabase.auth.signInWithPassword(credentials);
assert(!login.error, "Benchmark account login failed");
const results = [];
try {
  for (const route of process.argv[3] ? [process.argv[3]] : ["/", "/perfil", "/direcciones", "/mis-citas", "/admin/servicios", "/admin/configuracion"]) {
    const timings = [];
    for (let i = 0; i < 4; i++) {
      const start = performance.now();
      const response = await fetch(`http://localhost:3000${route}`, { headers: { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") }, redirect: "manual" });
      const html = await response.text();
      assert.equal(response.status, 200, `${route}: unexpected status`);
      assert(!html.includes('data-next-error-message='), `${route}: runtime error`);
      if (i) timings.push(Math.round(performance.now() - start));
    }
    const medianMs = [...timings].sort((a, b) => a - b)[1];
    const result = { route, samplesMs: timings, medianMs };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  const label = process.argv[2] === "before" ? "before" : "after";
  const suffix = process.argv[3] ? `-${process.argv[3].replace(/[^a-zA-Z0-9-]/g, "_")}` : "";
  writeFileSync(join(tmpdir(), `barbershop-navigation-${label}${suffix}.json`), JSON.stringify(results, null, 2));
} finally { await supabase.auth.signOut({ scope: "local" }); }
