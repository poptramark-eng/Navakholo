
import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const year =
      typeof body.year === "number" ||
      typeof body.year === "string"
        ? Number(body.year)
        : NaN;

    // Validate assessment details
    if (!name) {
      return NextResponse.json(
        { error: "Assessment name is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        { error: "A valid assessment year is required" },
        { status: 400 }
      );
    }

    const assessment = await prisma.assessment.create({
      data: {
        name,
        year,
      },
    });

    return NextResponse.json(
      {
        message: "Assessment created successfully",
        data: assessment,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle duplicate assessment
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "An assessment with this name already exists for this year",
        },
        { status: 409 }
      );
    }

    // Handle invalid JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    console.error("Create assessment error:", error);

    return NextResponse.json(
      { error: "Failed to create assessment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const yearParam = searchParams.get("year");
    const search = searchParams.get("search")?.trim();

    let year: number | undefined;

    // Validate year filter
    if (yearParam !== null) {
      year = Number(yearParam);

      if (
        !yearParam.trim() ||
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 2100
      ) {
        return NextResponse.json(
          { error: "Year must be a valid integer between 2000 and 2100" },
          { status: 400 }
        );
      }
    }

    // Fetch a single assessment
    if (id) {
      const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              candidates: true,
            },
          },
        },
      });

      if (!assessment) {
        return NextResponse.json(
          { error: "Assessment not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: assessment,
      });
    }

    // Fetch assessments with optional filters
    const assessments = await prisma.assessment.findMany({
      where: {
        ...(year !== undefined ? { year } : {}),
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
        _count: {
          select: {
            candidates: true,
          },
        },
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

    return NextResponse.json({
      count: assessments.length,
      data: assessments,
    });
  } catch (error) {
    console.error("Get assessments error:", error);

    return NextResponse.json(
      { error: "Failed to fetch assessments" },
      { status: 500 }
    );
  }
}
