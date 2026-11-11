
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { GradeLevel } from "@/generated/prisma/enums";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function generateCandidateNumber(year: number) {
  const uniquePart = randomBytes(6).toString("hex").toUpperCase();

  return `CAND-${year}-${uniquePart}`;
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("profile")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
      user: null,
    };
  }

  const decoded = await verifyToken(token);

  if (!decoded?.sub) {
    return {
      error: NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      ),
      user: null,
    };
  }

  const user = await prisma.users.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      role: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user || !user.schoolId || !user.school) {
    return {
      error: NextResponse.json(
        { error: "Your account is not associated with a school." },
        { status: 403 }
      ),
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

// --------------------------------------------------
// GET: RETRIEVE CANDIDATES
// GET /api/candidates?assessmentId=...&grade=GRADE_6
// --------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { user, error } = await getAuthenticatedUser();

    if (error || !user) {
      return error!;
    }

    // 2. Read query parameters
    const { searchParams } = new URL(request.url);

    const assessmentId = searchParams.get("assessmentId");
    const grade = searchParams.get("grade");
    const requestedSchoolId = searchParams.get("schoolId");

    // 3. Validate required parameters
    if (!assessmentId || !grade) {
      return NextResponse.json(
        {
          error: "Assessment ID and grade are required.",
        },
        { status: 400 }
      );
    }

    if (!Object.values(GradeLevel).includes(grade as GradeLevel)) {
      return NextResponse.json(
        { error: "Invalid grade level." },
        { status: 400 }
      );
    }

    // 4. Enforce school-level access
    if (
      requestedSchoolId &&
      requestedSchoolId !== user.schoolId
    ) {
      return NextResponse.json(
        {
          error: "You cannot access another school's candidates.",
        },
        { status: 403 }
      );
    }

    // 5. Verify assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "The selected assessment does not exist." },
        { status: 404 }
      );
    }

    // 6. Retrieve candidates
    const candidates = await prisma.examCandidate.findMany({
      where: {
        assessmentId,
        schoolId: user.schoolId,
        grade: grade as GradeLevel,
      },
      select: {
        id: true,
        name: true,
        learnerId: true,
        gender: true,
        grade: true,
        assessmentId: true,
        schoolId: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // 7. Return candidates
    return NextResponse.json({
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    console.error("GET candidates error:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve candidates.",
      },
      { status: 500 }
    );
  }
}

// --------------------------------------------------
// POST: REGISTER CANDIDATE
// POST /api/candidates
// --------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { user, error } = await getAuthenticatedUser();

    if (error || !user) {
      return error!;
    }

    // 2. Read request body
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const gender =
      typeof body.gender === "string"
        ? body.gender.trim().toUpperCase()
        : "";

    const assessmentId =
      typeof body.assessmentId === "string"
        ? body.assessmentId.trim()
        : "";

    const grade =
      typeof body.grade === "string"
        ? body.grade.trim()
        : "";

    const confirmDifferentLearner =
      body.confirmDifferentLearner === true;

    // 3. Validate input
    if (!name || !gender || !assessmentId || !grade) {
      return NextResponse.json(
        { error: "All required fields must be provided." },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Student name is too long." },
        { status: 400 }
      );
    }

    if (!["MALE", "FEMALE"].includes(gender)) {
      return NextResponse.json(
        { error: "Invalid gender." },
        { status: 400 }
      );
    }

    if (!Object.values(GradeLevel).includes(grade as GradeLevel)) {
      return NextResponse.json(
        { error: "Invalid grade level." },
        { status: 400 }
      );
    }

    // 4. Verify assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        name: true,
        year: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "The selected assessment does not exist." },
        { status: 404 }
      );
    }

    // 5. Check for possible duplicate candidates
    const possibleMatches = await prisma.examCandidate.findMany({
      where: {
        assessmentId,
        schoolId: user.schoolId,
        grade: grade as GradeLevel,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        grade: true,
        learnerId: true,
      },
      take: 5,
    });

    if (
      possibleMatches.length > 0 &&
      !confirmDifferentLearner
    ) {
      return NextResponse.json(
        {
          requiresConfirmation: true,
          message:
            "A learner with the same name and grade is already registered for this assessment.",
          possibleMatches: possibleMatches.map((candidate) => ({
            name: candidate.name,
            grade: candidate.grade,
            candidateNumber: candidate.learnerId,
          })),
        },
        { status: 409 }
      );
    }

    // 6. Generate candidate number and register
    let candidate;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateNumber = generateCandidateNumber(
        assessment.year
      );

      try {
        candidate = await prisma.examCandidate.create({
          data: {
            name,
            gender,
            grade: grade as GradeLevel,
            assessmentId,
            schoolId: user.schoolId,
            learnerId: candidateNumber,
          },
          select: {
            id: true,
            name: true,
            grade: true,
            learnerId: true,
            assessmentId: true,
          },
        });

        break;
      } catch (error) {
        if (isPrismaUniqueError(error)) {
          continue;
        }

        throw error;
      }
    }

    if (!candidate) {
      return NextResponse.json(
        {
          error:
            "Could not generate a candidate number. Please try again.",
        },
        { status: 500 }
      );
    }

    // 7. Return registration result
    return NextResponse.json(
      {
        message: "Student registered successfully.",
        data: {
          id: candidate.id,
          name: candidate.name,
          grade: candidate.grade,
          candidateNumber: candidate.learnerId,
          assessmentId: candidate.assessmentId,
          school: user.school.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST candidate registration error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while registering the student.",
      },
      { status: 500 }
    );
  }
}
