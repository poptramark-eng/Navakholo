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

    if (!name) {
      return NextResponse.json(
        { error: "Region name is required" },
        { status: 400 }
      );
    }

    const region = await prisma.region.create({
      data: {
        name,
      },
    });

    return NextResponse.json(
      {
        message: "Region created successfully",
        data: region,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A region with this name already exists" },
        { status: 409 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    console.error("Create region error:", error);

    return NextResponse.json(
      { error: "Failed to create region" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const search = searchParams.get("search");

    // Fetch one region by ID
    if (id) {
      const region = await prisma.region.findUnique({
        where: { id },
        include: {
          county: true,
        },
      });

      if (!region) {
        return NextResponse.json(
          { error: "Region not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: region });
    }

    // Fetch all regions or search by name
    const regions = await prisma.region.findMany({
      where: search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : undefined,
      include: {
        county: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      count: regions.length,
      data: regions,
    });
  } catch (error) {
    console.error("Get regions error:", error);

    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}