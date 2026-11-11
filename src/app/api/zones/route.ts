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

    const subcountyId =
      typeof body.subcountyId === "string"
        ? body.subcountyId.trim()
        : "";
 console.log(name, subcountyId);
    if (!name || !subcountyId) {
      return NextResponse.json(
        { error: "Zone name and subcountyId are required" },
        { status: 400 }
      );
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        subcounty: {
          connect: { id: subcountyId },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Zone created successfully",
        data: zone,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A zone with this name already exists" },
          { status: 409 }
        );
      }

      if (error.code === "P2025" || error.code === "P2003") {
        return NextResponse.json(
          { error: "The specified subcounty does not exist" },
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

    console.error("Create zone error:", error);

    return NextResponse.json(
      { error: "Failed to create zone" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const subcountyId = searchParams.get("subcountyId");
    const search = searchParams.get("search");

    if (id) {
      const zone = await prisma.zone.findUnique({
        where: { id },
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
          cluster: true,
        },
      });

      if (!zone) {
        return NextResponse.json(
          { error: "Zone not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: zone });
    }

    const zones = await prisma.zone.findMany({
      where: {
        ...(subcountyId ? { subcountyId } : {}),
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
        subcounty: true,
        cluster: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      count: zones.length,
      data: zones,
    });
  } catch (error) {
    console.error("Get zones error:", error);

    return NextResponse.json(
      { error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}