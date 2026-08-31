import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // everything except Next internals, static assets, and PWA files that must
    // be publicly fetchable (manifest, service worker, offline page, icons)
    "/((?!_next/static|_next/image|favicon.ico|assets/|manifest.webmanifest|sw\\.js|offline\\.html|apple-touch-icon\\.png|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
