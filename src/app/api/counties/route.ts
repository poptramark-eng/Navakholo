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

    const regionId =
      typeof body.regionId === "string"
        ? body.regionId.trim()
        : "";

    if (!name || !regionId) {
      return NextResponse.json(
        { error: "County name and regionId are required" },
        { status: 400 }
      );
    }

    const county = await prisma.county.create({
      data: {
        name,
        region: {
          connect: { id: regionId },
        },
      },
    });

    return NextResponse.json(
      {
        message: "County created successfully",
        data: county,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A county with this name already exists" },
          { status: 409 }
        );
      }

      if (error.code === "P2025" || error.code === "P2003") {
        return NextResponse.json(
          { error: "The specified region does not exist" },
          { status: 400 }
        );
      }
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    console.error("Create county error:", error);

    return NextResponse.json(
      { error: "Failed to create county" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const regionId = searchParams.get("regionId");
    const search = searchParams.get("search");

    if (id) {
      const county = await prisma.county.findUnique({
        where: { id },
        include: {
          region: true,
          subcounty: true,
        },
      });

      if (!county) {
        return NextResponse.json(
          { error: "County not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: county });
    }

    const counties = await prisma.county.findMany({
      where: {
        ...(regionId ? { regionId } : {}),
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        region: true,
        subcounty: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      count: counties.length,
      data: counties,
    });
  } catch (error) {
    console.error("Get counties error:", error);

    return NextResponse.json(
      { error: "Failed to fetch counties" },
      { status: 500 }
    );
  }
}