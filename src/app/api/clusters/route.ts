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

    const zoneId =
      typeof body.zoneId === "string"
        ? body.zoneId.trim()
        : "";

    if (!name || !zoneId) {
      return NextResponse.json(
        { error: "Cluster name and zoneId are required" },
        { status: 400 }
      );
    }

    const cluster = await prisma.cluster.create({
      data: {
        name,
        Zone: {
          connect: { id: zoneId },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Cluster created successfully",
        data: cluster,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A cluster with this name already exists" },
          { status: 409 }
        );
      }

      if (error.code === "P2025" || error.code === "P2003") {
        return NextResponse.json(
          { error: "The specified zone does not exist" },
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

    console.error("Create cluster error:", error);

    return NextResponse.json(
      { error: "Failed to create cluster" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const zoneId = searchParams.get("zoneId");
    const search = searchParams.get("search");

    if (id) {
      const cluster = await prisma.cluster.findUnique({
        where: { id },
        include: {
          Zone: {
            include: {
              subcounty: true,
            },
          },
          schools: true,
        },
      });

      if (!cluster) {
        return NextResponse.json(
          { error: "Cluster not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: cluster });
    }

    const clusters = await prisma.cluster.findMany({
      where: {
        ...(zoneId ? { zoneId } : {}),
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
        Zone: true,
        schools: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      count: clusters.length,
      data: clusters,
    });
  } catch (error) {
    console.error("Get clusters error:", error);

    return NextResponse.json(
      { error: "Failed to fetch clusters" },
      { status: 500 }
    );
  }
}