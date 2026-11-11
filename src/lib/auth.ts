// src/lib/auth.ts

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not configured.");
}

const JWT_SECRET = new TextEncoder().encode(secret);

export type AuthPayload = JWTPayload & {
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
};

export async function signToken(payload: {
  userId: string;
  email: string;
  name: string;
  role: string;
  schoolId: string | null;
}) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    schoolId: payload.schoolId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    if (
      !payload.sub ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    return payload as AuthPayload;
  } catch {
    return null;
  }
}