import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Read JWT cookie
    const token = request.cookies.get("profile")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Verify JWT
    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    // Fetch current user and school information
    const profile = await prisma.users.findUnique({
      where: {
        id: user.sub,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: profile,
    });
  } catch (error) {
    console.error("Profile retrieval error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve profile." },
      { status: 500 }
    );
  }
}