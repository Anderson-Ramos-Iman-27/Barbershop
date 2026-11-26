// Read-only authenticated route timings. Credentials enter through stdin only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";
const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
const credentials = await new Promise(resolve => {
  let text = "";
  process.stdin.on("data", chunk => {
    text += chunk;
    try { resolve(JSON.parse(text)); process.stdin.pause(); if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch { /* Wait for full JSON. */ }
  });
});
const jar = new Map();
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: cookies => cookies.forEach(({name,value}) => jar.set(name,value)) },
});
const routes = ["", "/servicios", "/profesionales", "/galeria", "/configuracion", "/reservas", "/calendario", "/horarios"];
try {
  const login = await supabase.auth.signInWithPassword(credentials);
  assert(!login.error && login.data.user, "Login failed");
  const role = await supabase.from("profiles").select("role").eq("id",login.data.user.id).single();
  assert.equal(role.data?.role,"admin");
  const headers = { Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join("; ") };
  for (let round=1; round<=2; round++) {
    for (const suffix of routes) {
      const start=performance.now();
      const result=await fetch(`http://localhost:3000/admin${suffix}`,{headers});
      const html=await result.text();
      assert.equal(result.status,200,`/admin${suffix}`);
      assert(!html.includes("data-next-error-message=") && !html.includes("NEXT_HTTP_ERROR_FALLBACK;500"), "Runtime failure");
      assert(html.includes("Panel administrativo"),"Admin shell absent");
      if (process.argv.includes("--theme")) {
        assert(html.includes("data-admin-theme"),"New admin theme missing");
        if (round === 1 && suffix === "") {
          const paths = [...html.matchAll(/href="([^"\s]+\.css(?:\?[^"\s]*)?)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
          const styles = await Promise.all([...new Set(paths)].map(async path => (await fetch(new URL(path,"http://localhost:3000"))).text()));
          assert(styles.some(css => css.includes("[data-admin-theme]") && css.includes("[data-admin-card-header]")),"Scoped admin stylesheet not served");
          assert(!styles.some(css => css.includes(":global(")),"Unprocessed CSS Module syntax leaked to browser");
        }
      }
      console.log(JSON.stringify({round,route:`/admin${suffix}`,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(html),pass:true}));
    }
  }
  const anonymous=await fetch("http://localhost:3000/admin",{redirect:"manual"});
  assert(anonymous.headers.get("location")?.includes("/login") || (await anonymous.text()).includes("/login?next="));
  console.log("PASS: all admin pages, runtime checks, anonymous denial; no application data changed. Timings are development HTTP, not browser navigation metrics.");
} finally { await supabase.auth.signOut({scope:"local"}); }
