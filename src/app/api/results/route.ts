
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

import {
  curriculum,
  grades,
  isGrade,
  type Grade,
} from "@/config/curriculum";

// ---------------------------------------------
// AUTHENTICATION AND ACCESS SCOPE
// ---------------------------------------------

async function getUserScope() {
  const cookieStore = await cookies();
  const token = cookieStore.get("profile")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      ),
    };
  }

  let payload: Awaited<ReturnType<typeof verifyToken>>;

  try {
    payload = await verifyToken(token);
  } catch {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      ),
    };
  }

  if (!payload?.sub) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Invalid authentication token",
        },
        { status: 401 }
      ),
    };
  }

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
          message: "User not found",
        },
        { status: 401 }
      ),
    };
  }

  // ADMIN: access candidates within their cluster
  if (user.role === "ADMIN") {
    if (!user.school?.clusterId) {
      return {
        error: NextResponse.json(
          {
            success: false,
            message: "Administrator is not assigned to a valid cluster",
          },
          { status: 403 }
        ),
      };
    }

    return {
      user,
      candidateScope: {
        school: {
          clusterId: user.school.clusterId,
        },
      },
    };
  }

  // Other users: access candidates within their school
  if (!user.schoolId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "User is not assigned to a school",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    candidateScope: {
      schoolId: user.schoolId,
    },
  };
}

// ---------------------------------------------
// GET RESULTS
// ---------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await getUserScope();

    if ("error" in auth) {
      return auth.error;
    }

    // 2. Read query parameters
    const searchParams = request.nextUrl.searchParams;

    const assessmentId = searchParams.get("assessmentId");
    const gradeParam = searchParams.get("grade");

    if (!assessmentId) {
      return NextResponse.json(
        {
          success: false,
          message: "assessmentId is required",
        },
        { status: 400 }
      );
    }

    // 3. Validate grade
    if (gradeParam && !isGrade(gradeParam)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid grade",
          allowedGrades: grades,
        },
        { status: 400 }
      );
    }

    const grade: Grade | undefined = gradeParam
      ? (gradeParam as Grade)
      : undefined;

    const selectedGrades: Grade[] = grade
      ? [grade]
      : [...grades];

    // 4. Verify assessment
    const assessment = await prisma.assessment.findUnique({
      where: {
        id: assessmentId,
      },
      select: {
        id: true,
        name: true,
        year: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        {
          success: false,
          message: "Assessment not found",
        },
        { status: 404 }
      );
    }

    // 5. Collect configured subject codes
    const configuredCodes = [
      ...new Set(
        selectedGrades.flatMap(
          (selectedGrade) => curriculum[selectedGrade]
        )
      ),
    ];

    // 6. Retrieve matching database subjects
    const subjects = await prisma.subject.findMany({
      where: {
        code: {
          in: configuredCodes,
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    const subjectMap = new Map(
      subjects.map((subject) => [subject.code, subject])
    );

    // 7. Detect missing subjects
    const missingCodes = configuredCodes.filter(
      (code) => !subjectMap.has(code)
    );

    if (missingCodes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Some configured subjects do not exist in the database",
          missingCodes,
        },
        { status: 500 }
      );
    }

    // 8. Retrieve candidates within the user's access scope
    const candidates = await prisma.examCandidate.findMany({
      where: {
        assessmentId,
        ...auth.candidateScope,
        ...(grade ? { grade } : {}),
      },

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
            cluster:{
              select:{
                id:true,
                name: true,
              }
            }
          },
          
        },
        

        scores: {
          select: {
            marks: true,
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

    // 9. Group and calculate results by grade
    const data = selectedGrades.map((selectedGrade) => {
      const gradeCandidates = candidates.filter(
        (candidate) => candidate.grade === selectedGrade
      );

      // Dynamic columns for the current grade
      const columns = curriculum[selectedGrade].map((code) => {
        const subject = subjectMap.get(code)!;

        return {
          id: subject.id,
          code: subject.code,
          name: subject.name,
        };
      });

      // Build student rows
      const rows = gradeCandidates.map((candidate) => {
        const scoreMap = new Map(
          candidate.scores.map((score) => [
            score.subject.code,
            Number(score.marks),
          ])
        );

        // Missing marks remain null
        const scores = Object.fromEntries(
          columns.map((subject) => [
            subject.code,
            scoreMap.get(subject.code) ?? null,
          ])
        );

        // Calculate total using recorded marks only
        const total = Object.values(scores).reduce<number>(
          (sum, mark) => sum + (mark ?? 0),
          0
        );

        const recordedSubjects = Object.values(scores).filter(
          (mark) => mark !== null
        ).length;

        return {
          id: candidate.id,
          learnerId: candidate.learnerId,
          name: candidate.name,
          gender: candidate.gender,
          school: candidate.school,
          scores,
          total,
          recordedSubjects,
          position: 0,
        };
      });

      // Sort highest total first
      rows.sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.name.localeCompare(b.name);
      });

      // Competition ranking: 1, 2, 2, 4
      let previousTotal: number | null = null;
      let currentPosition = 0;

      rows.forEach((row, index) => {
        if (row.total !== previousTotal) {
          currentPosition = index + 1;
          previousTotal = row.total;
        }

        row.position = currentPosition;
      });

      return {
        grade: selectedGrade,
        count: rows.length,
        columns,
        rows,
      };
    });

    // 10. Return results
    return NextResponse.json({
      success: true,
      assessment,
      count: candidates.length,
      data,
    });
  } catch (error) {
    console.error("GET RESULTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve results",
      },
      { status: 500 }
    );
  }
}
