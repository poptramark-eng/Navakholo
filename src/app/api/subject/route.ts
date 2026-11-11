import { NextResponse, NextRequest } from "next/server";
import prisma from "../../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    if (!name || !code) {
      return NextResponse.json(
        { error: "Subject name and code are required" },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
      },
    });

    return NextResponse.json(
      {
        message: "Subject created successfully",
        data: subject,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A subject with this name or code already exists" },
        { status: 409 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    console.error("Create subject error:", error);

    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const search = searchParams.get("search");

    // Fetch one subject by ID
    if (id) {
      const subject = await prisma.subject.findUnique({
        where: { id },

      });

      if (!subject) {
        return NextResponse.json(
          { error: "subject not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: subject });
    }

    // Fetch all subjects or search by name
    const subjects = await prisma.subject.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : undefined,
     
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error("Get subjects error:", error);

    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}