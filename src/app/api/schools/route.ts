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

    const clusterId =
      typeof body.clusterId === "string"
        ? body.clusterId.trim()
        : "";

    if (!name || !clusterId) {
      return NextResponse.json(
        { error: "School name and clusterId are required" },
        { status: 400 }
      );
    }

    const school = await prisma.school.create({
      data: {
        name,
        cluster: {
          connect: { id: clusterId },
        },
      },
    });

    return NextResponse.json(
      {
        message: "School created successfully",
        data: school,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A school with this name already exists in this cluster" },
          { status: 409 }
        );
      }

      if (error.code === "P2025" || error.code === "P2003") {
        return NextResponse.json(
          { error: "The specified cluster does not exist" },
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

    console.error("Create school error:", error);

    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const clusterId = searchParams.get("clusterId");
    const search = searchParams.get("search");

    if (id) {
      const school = await prisma.school.findUnique({
        where: { id },
        include: {
          cluster: {
            include: {
              Zone: {
                include: {
                  subcounty: {
                    include: {
                      county: {
                        include: {
                          region: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              users: true,
              candidates: true,
            },
          },
        },
      });

      if (!school) {
        return NextResponse.json(
          { error: "School not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: school });
    }

    const schools = await prisma.school.findMany({
      where: {
        ...(clusterId ? { clusterId } : {}),
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
        cluster: true,
        _count: {
          select: {
            users: true,
            candidates: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      count: schools.length,
      data: schools,
    });
  } catch (error) {
    console.error("Get schools error:", error);

    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 }
    );
  }
}