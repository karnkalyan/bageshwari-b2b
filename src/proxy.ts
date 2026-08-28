import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
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
    else if (segments[0] === "dealer") destination.pathname = segments.length === 1 ? "/dealer/dashboard" : `/dealer/${segments.slice(1).join("/")}`;
    else if (segments[0] === "admin") destination.pathname = segments.length === 1 ? "/admin/dashboard" : `/admin/${segments.slice(1).join("/")}`;
    else destination.pathname = "/";
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*", "/platform/:path*", "/select-workspace"],
};
