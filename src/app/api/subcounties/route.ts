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

    const countyId =
      typeof body.countyId === "string"
        ? body.countyId.trim()
        : "";

    if (!name || !countyId) {
      return NextResponse.json(
        { error: "County name and countyId are required" },
        { status: 400 }
      );
    }

    const county = await prisma.subcounty.create({
      data: {
        name,
        county: {
          connect: { id: countyId },
        },
      },
    });

    return NextResponse.json(
      {
        message: "SubCounty created successfully",
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
          { error: "A SubCounty with this name already exists" },
          { status: 409 }
        );
      }

      if (error.code === "P2025" || error.code === "P2003") {
        return NextResponse.json(
          { error: "The specified county does not exist" },
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

    console.error("Create SubCounty error:", error);

    return NextResponse.json(
      { error: "Failed to create SubCounty" },
      { status: 500 }
    );
  }
}



export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const countyId = searchParams.get("countyId");
    const search = searchParams.get("search");

  try {
    

    if (id) {
      const subcounty = await prisma.subcounty.findUnique({
        where: { id },
        include: {
          county: true,
          
        },
      });

      if (!subcounty) {
        return NextResponse.json(
          { error: "subcounty not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: subcounty });
    }

    const counties = await prisma.subcounty.findMany({
      where: {
        ...(countyId ? { countyId } : {}),
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
        county: true,
        
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
    console.error("Get subcounties error:", error);

    return NextResponse.json(
      { error: "Failed to fetch subcounties" },
      { status: 500 }
    );
  }
}

