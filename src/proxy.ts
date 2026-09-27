import { NextResponse, type NextRequest } from "next/server";

const SERVER_ACTION_ID_PATTERN = /^[0-9a-f]{42}$/i;

export function proxy(request: NextRequest) {
  const serverActionId = request.headers.get("next-action");

  // Next.js otherwise tries to decode arbitrary values as Server Action IDs
  // and emits a noisy framework stack trace. Real action references generated
  // by this Next.js version are 42-character hexadecimal IDs.
  if (serverActionId && !SERVER_ACTION_ID_PATTERN.test(serverActionId)) {
    return new NextResponse("Invalid Server Action request", { status: 400 });
  }

  const { pathname } = request.nextUrl;
  const destination = request.nextUrl.clone();

  if (pathname === "/select-workspace" || pathname.startsWith("/platform")) {
    destination.pathname = "/admin/dashboard";
    return NextResponse.redirect(destination);
  }

  if (pathname.startsWith("/s/")) {
    const [, , , ...segments] = pathname.split("/");
    if (!segments.length) destination.pathname = "/";
    else if (segments[0] === "login") destination.pathname = "/dealer/login";
    else if (segments[0] === "request-dealership") destination.pathname = "/request-dealership";
    else if (segments[0] === "products") destination.pathname = `/products${segments.length > 1 ? `/${segments.slice(1).join("/")}` : ""}`;
    else if (segments[0] === "dealer") destination.pathname = segments.length === 1 ? "/dealer/products" : `/dealer/${segments.slice(1).join("/")}`;
    else if (segments[0] === "admin") destination.pathname = segments.length === 1 ? "/admin/dashboard" : `/admin/${segments.slice(1).join("/")}`;
    else destination.pathname = "/";
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
