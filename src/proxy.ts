
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read JWT cookie
  const token = request.cookies.get("profile")?.value;

  // Verify JWT
  let profile = null;

  if (token) {
    try {
      profile = await verifyToken(token);
    } catch {
      profile = null;
    }
  }

  // Redirect authenticated users away from login
  if (profile && pathname === "/dashboard/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Reject unauthenticated API requests
  if (!profile && pathname.startsWith("/api/")) {
    const response = NextResponse.json(
      {
        success: false,
        message: "Authentication required",
      },
      { status: 401 }
    );

    if (token) {
      response.cookies.delete("profile");
    }

    return response;
  }

  // Redirect unauthenticated page requests
  if (!profile) {
    const response = NextResponse.redirect(
      new URL("/dashboard/login", request.url)
    );

    if (token) {
      response.cookies.delete("profile");
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Public pages:
     * /dashboard/login
     * /dashboard/register/*
     * /dashboard/welcome/*
     *
     * Public APIs:
     * /api/users/*
     * /api/counties/*
     * /api/subcounties/*
     * /api/zones/*
     * /api/clusters/*
     * /api/schools/*
     *
     * Everything else requires authentication.
     */
    "/((?!_next/static|_next/image|favicon.ico|dashboard/login(?:/|$)|dashboard/register(?:/|$)|dashboard/welcome(?:/|$)|api/users(?:/|$)|api/counties(?:/|$)|api/subcounties(?:/|$)|api/zones(?:/|$)|api/clusters(?:/|$)|api/schools(?:/|$)).*)",
  ],
};
