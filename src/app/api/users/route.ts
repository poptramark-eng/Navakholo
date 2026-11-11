
import { NextRequest, NextResponse } from "next/server";

import prisma from "../../../lib/prisma";
import { Prisma, role as UserRole } from "../../../generated/prisma/client";

import bcrypt from "bcryptjs";

// ------------------------------------
// POST: REGISTER USER
// ------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Extract and normalize fields
    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const tsc =
      typeof body.tsc === "string"
        ? body.tsc.trim()
        : "";

    const schoolId =
      typeof body.schoolId === "string"
        ? body.schoolId.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const phone =
      typeof body.phone === "string" ||
      typeof body.phone === "number"
        ? Number(body.phone)
        : NaN;

    const selectedRole = body.role;

    // ------------------------------------
    // VALIDATION
    // ------------------------------------

    const validRoles = Object.values(UserRole);

    if (
      !name ||
      !email ||
      !tsc ||
      !schoolId ||
      !password ||
      !Number.isSafeInteger(phone) ||
      phone <= 0 ||
      typeof selectedRole !== "string" ||
      !validRoles.includes(selectedRole as UserRole)
    ) {
      return NextResponse.json(
        { error: "Please provide valid user details" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must contain at least 8 characters",
        },
        { status: 400 }
      );
    }

    // ------------------------------------
    // PASSWORD HASHING
    // ------------------------------------

    const hashedPassword = await bcrypt.hash(password, 12);

    // ------------------------------------
    // CREATE USER
    // ------------------------------------

    const user = await prisma.users.create({
      data: {
        name,
        email,
        tsc,
        phone,
        password: hashedPassword,
        role: selectedRole as UserRole,

        school: {
          connect: {
            id: schoolId,
          },
        },
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tsc: true,
        role: true,
        schoolId: true,

        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        data: user,
      },
      { status: 201 }
    );

  } catch (error) {

    // ------------------------------------
    // PRISMA ERRORS
    // ------------------------------------

    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {

      // Unique constraint violation
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            error: "Email or TSC number already exists",
          },
          { status: 409 }
        );
      }

      // Missing related record / invalid relation
      if (
        error.code === "P2025" ||
        error.code === "P2003"
      ) {
        return NextResponse.json(
          {
            error: "The specified school does not exist",
          },
          { status: 400 }
        );
      }
    }

    // Invalid JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    console.error("Create user error:", error);

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// ------------------------------------
// GET: RETRIEVE USERS
// ------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const schoolId = searchParams.get("schoolId");
    const selectedRole = searchParams.get("role");
    const search = searchParams.get("search");

    const validRoles = Object.values(UserRole);

    // Validate role filter
    if (
      selectedRole &&
      !validRoles.includes(selectedRole as UserRole)
    ) {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 400 }
      );
    }

    // ------------------------------------
    // GET SINGLE USER
    // ------------------------------------

    if (id) {
      const user = await prisma.users.findUnique({
        where: { id },

        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          tsc: true,
          role: true,
          schoolId: true,

          school: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: user,
      });
    }

    // ------------------------------------
    // GET MULTIPLE USERS
    // ------------------------------------

    const users = await prisma.users.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),

        ...(selectedRole
          ? { role: selectedRole as UserRole }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tsc: true,
        role: true,
        schoolId: true,

        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      count: users.length,
      data: users,
    });

  } catch (error) {
    console.error("Get users error:", error);

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// ------------------------------------
// PUT: BACKWARD COMPATIBILITY
// ------------------------------------

export async function PUT(request: NextRequest) {
  return GET(request);
}
