/**
 * Local password-based authentication for NEON SIGNS (post-Manus migration)
 * Replaces Manus OAuth with a single admin password stored as a bcrypt hash.
 *
 * Environment variables required:
 *   ADMIN_PASSWORD_HASH  — bcrypt hash of the admin password
 *   JWT_SECRET           — session cookie signing secret (unchanged)
 *
 * To generate a hash:  node scripts/hash-password.mjs
 */

import type { Express, Request, Response } from "express";
import * as bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import * as db from "../db";
import type { User } from "../../drizzle/schema";
import { ForbiddenError } from "@shared/_core/errors";

// The single admin openId — a stable identifier for the local admin user
const LOCAL_ADMIN_OPEN_ID = "local-admin";

function getSessionSecret() {
  const secret = process.env.JWT_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(openId: string, name: string): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    openId,
    appId: "local",
    name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifySessionCookie(
  cookieValue: string | undefined | null
): Promise<{ openId: string; name: string } | null> {
  if (!cookieValue) return null;
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || !openId) return null;
    return { openId, name: typeof name === "string" ? name : "" };
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const sessionCookie = cookies[COOKIE_NAME];
  const session = await verifySessionCookie(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  const user = await db.getUserByOpenId(session.openId);
  if (!user) {
    throw ForbiddenError("User not found");
  }

  return user;
}

export function registerLocalAuthRoutes(app: Express) {
  // Login page — serve the SPA (React handles the /login route)
  // POST /api/auth/login — accepts { password }, validates, issues session cookie
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body as { password?: string };

    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    const storedHash = process.env.ADMIN_PASSWORD_HASH;
    if (!storedHash) {
      console.error("[LocalAuth] ADMIN_PASSWORD_HASH is not set");
      res.status(500).json({ error: "Auth not configured" });
      return;
    }

    const valid = await bcrypt.compare(password, storedHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    // Ensure the admin user exists in the DB
    await db.upsertUser({
      openId: LOCAL_ADMIN_OPEN_ID,
      name: "Admin",
      email: null,
      loginMethod: "local",
      lastSignedIn: new Date(),
    });

    const sessionToken = await createSessionToken(LOCAL_ADMIN_OPEN_ID, "Admin");
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    res.json({ success: true });
  });

  // POST /api/auth/logout — clears the session cookie
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });
}
