import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { getSafeNextPath } from "@/features/auth/redirect";
import { getCurrentActor } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  const cookieStore = await cookies();
  const googleIntent = cookieStore.get("ow-google-intent")?.value;
  cookieStore.delete({ name: "ow-google-intent", path: "/auth/callback" });
  const redirectUrl = new URL(nextPath, request.url);
  const failureUrl = new URL(
    nextPath === "/restablecer-contrasena" ? "/recuperar-acceso" : googleIntent === "register" ? "/registro" : "/login",
    request.url,
  );
  failureUrl.searchParams.set("error", "auth");
  if (googleIntent === "register") failureUrl.searchParams.set("reason", "google_unavailable");
  failureUrl.searchParams.set("next", nextPath);

  if (!code || request.nextUrl.searchParams.has("error")) {
    if (googleIntent && request.nextUrl.searchParams.get("error_description")?.includes("registration_required")) {
      const registration = new URL("/registro", request.url);
      registration.searchParams.set("reason", "not_registered");
      registration.searchParams.set("next", nextPath === "/" ? "/reservar" : nextPath);
      return NextResponse.redirect(registration);
    }
    return NextResponse.redirect(failureUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(failureUrl);
  }

  const actor = await getCurrentActor();
  if (nextPath === "/" && actor?.role === "admin") redirectUrl.pathname = "/admin";
  return NextResponse.redirect(redirectUrl);
}
