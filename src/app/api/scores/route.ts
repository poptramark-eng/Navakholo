
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// ------------------------------------
// AUTHENTICATION & ACCESS SCOPE
// ------------------------------------

async function getUserScope() {
  const cookieStore = await cookies();
  const token = cookieStore.get("profile")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      ),
    };
  }

  const payload = await verifyToken(token);

  if (!payload?.sub) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Invalid or expired session.",
        },
        { status: 401 }
      ),
    };
  }

  // Retrieve authenticated user
  const user = await prisma.users.findUnique({
    where: {
      id: payload.sub,
    },
    select: {
      id: true,
      role: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          clusterId: true,
        },
      },
    },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 401 }
      ),
    };
  }

  // Determine access scope
  const isAdmin = user.role === "ADMIN";

  if (isAdmin && !user.school?.clusterId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Your account is not assigned to a cluster.",
        },
        { status: 403 }
      ),
    };
  }

  if (!isAdmin && !user.schoolId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Your account is not assigned to a school.",
        },
        { status: 403 }
      ),
    };
  }

  // Candidate access filter
  const candidateScope = isAdmin
    ? {
        school: {
          clusterId: user.school!.clusterId!,
        },
      }
    : {
        schoolId: user.schoolId,
      };

  return {
    candidateScope,
  };
}

// ------------------------------------
// MARKS VALIDATION
// ------------------------------------

function validateMarks(marks: unknown): number | null {
  if (
    typeof marks !== "number" &&
    typeof marks !== "string"
  ) {
    return null;
  }

  const value = String(marks).trim();

  if (!/^\d{1,5}(\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const numericMarks = Number(value);

  if (
    !Number.isFinite(numericMarks) ||
    numericMarks < 0 ||
    numericMarks > 100
  ) {
    return null;
  }

  return numericMarks;
}

// ------------------------------------
// POST: CREATE SCORE
// ------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await getUserScope();

    if (auth.error) return auth.error;

    // 2. Read request body
    const body = await request.json();

    const candidateId =
      typeof body.candidateId === "string"
        ? body.candidateId.trim()
        : "";

    const subjectId =
      typeof body.subjectId === "string"
        ? body.subjectId.trim()
        : "";

    const marks = validateMarks(body.marks);

    // 3. Validate input
    if (!candidateId || !subjectId || marks === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Candidate ID, subject ID, and valid marks are required. Marks must be between 0 and 100 with at most two decimal places.",
        },
        { status: 400 }
      );
    }

    // 4. Verify candidate belongs to user's scope
    const candidate = await prisma.examCandidate.findFirst({
      where: {
        id: candidateId,
        ...auth.candidateScope,
      },
      select: {
        id: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          message: "Candidate not found or access denied.",
        },
        { status: 404 }
      );
    }

    // 5. Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: {
        id: subjectId,
      },
      select: {
        id: true,
      },
    });

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          message: "Subject not found.",
        },
        { status: 404 }
      );
    }

    // 6. Create score
    const score = await prisma.score.create({
      data: {
        marks: new Prisma.Decimal(String(marks)),
        candidateId,
        subjectId,
      },
      select: {
        id: true,
        marks: true,
        candidateId: true,
        subjectId: true,
        candidate: {
          select: {
            name: true,
            learnerId: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // 7. Return response
    return NextResponse.json(
      {
        success: true,
        message: "Score recorded successfully.",
        data: score,
      },
      { status: 201 }
    );

  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message:
              "A score for this candidate and subject already exists.",
          },
          { status: 409 }
        );
      }

      if (
        error.code === "P2025" ||
        error.code === "P2003"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The specified candidate or subject does not exist.",
          },
          { status: 400 }
        );
      }
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    console.error("POST /api/scores error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to record score.",
      },
      { status: 500 }
    );
  }
}

// ------------------------------------
// GET: RETRIEVE SCORES
// ------------------------------------

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await getUserScope();

    if (auth.error) return auth.error;

    // 2. Extract query parameters
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const candidateId = searchParams.get("candidateId");
    const subjectId = searchParams.get("subjectId");

    // 3. Retrieve individual score
    if (id) {
      const score = await prisma.score.findFirst({
        where: {
          id,
          candidate: auth.candidateScope,
        },
        include: {
          candidate: {
            include: {
              school: true,
              assessment: true,
            },
          },
          subject: true,
        },
      });

      if (!score) {
        return NextResponse.json(
          {
            success: false,
            message: "Score not found or access denied.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: score,
      });
    }

    // 4. Retrieve filtered scores
    const scores = await prisma.score.findMany({
      where: {
        ...(candidateId ? { candidateId } : {}),
        ...(subjectId ? { subjectId } : {}),

        candidate: auth.candidateScope,
      },

      include: {
        candidate: {
          select: {
            id: true,
            learnerId: true,
            name: true,
            gender: true,
            grade: true,

            school: {
              select: {
                id: true,
                name: true,
              },
            },

            assessment: {
              select: {
                id: true,
                name: true,
                year: true,
              },
            },
          },
        },

        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },

      orderBy: [
        {
          candidate: {
            name: "asc",
          },
        },
        {
          subject: {
            name: "asc",
          },
        },
      ],
    });

    // 5. Return response
    return NextResponse.json({
      success: true,
      count: scores.length,
      data: scores,
    });

  } catch (error) {
    console.error("GET /api/scores error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve scores.",
      },
      { status: 500 }
    );
  }
}
