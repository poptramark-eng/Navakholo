import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    // 1. Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get("profile")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload?.sub) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired session.",
        },
        { status: 401 }
      );
    }

    // 2. Retrieve the authenticated user from the database
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
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 401 }
      );
    }

    // 3. Determine the user's access scope
    const isAdmin = user.role === "ADMIN";

    // An ADMIN can access results within their own cluster.
    if (isAdmin && !user.school?.clusterId) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not assigned to a cluster.",
        },
        { status: 403 }
      );
    }

    // Other users can access results within their own school.
    if (!isAdmin && !user.schoolId) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not assigned to a school.",
        },
        { status: 403 }
      );
    }

    // 4. Build the candidate access filter
    const candidateScope = isAdmin
      ? {
          school: {
            clusterId: user.school!.clusterId!,
          },
        }
      : {
          schoolId: user.schoolId!,
        };

    // 5. Retrieve accessible assessments
    const assessments = await prisma.assessment.findMany({
      where: {
        candidates: {
          some: candidateScope,
        },
      },

      select: {
        id: true,
        name: true,

        candidates: {
          where: candidateScope,

          select: {
            id: true,
            schoolId: true,

            scores: {
              select: {
                id: true,
              },
            },
          },
        },
      },

      orderBy: {
        name: "desc",
      },
    });

    // 6. Calculate assessment statistics
    const data = assessments.map((assessment) => {
      const schoolIds = new Set(
        assessment.candidates.map((candidate) => candidate.schoolId)
      );

      const scoreCount = assessment.candidates.reduce(
        (total, candidate) => total + candidate.scores.length,
        0
      );

      return {
        id: assessment.id,
        name: assessment.name,
        candidateCount: assessment.candidates.length,
        schoolCount: schoolIds.size,
        scoreCount,
      };
    });

    // 7. Return results
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET /api/results error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve assessments.",
      },
      { status: 500 }
    );
  }
}