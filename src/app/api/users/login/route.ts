// app/api/users/login/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body: {
      email?: string;
      password?: string;
    } = await request.json();

    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.users.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Check user existence
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify password
    const passwordVerify = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordVerify) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.school?.id ?? null,
    });

    // Create response
    const response = NextResponse.json({
      message: "logged in succesfully",
    });

    // Set HTTP-only cookie
    response.cookies.set({
      name: "profile",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}