/**
 * API Middleware - centralizované auth a error handling
 * Použitie: withAuth(handler), withAdmin(handler)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodSchema, ZodError } from "zod";

// Types
export interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

// Error responses
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function unauthorized(message = "Neprihlásený používateľ"): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

export function forbidden(message = "Nemáte oprávnenie na túto akciu"): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

export function badRequest(message: string, errors?: Record<string, string[]>): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message, errors },
    { status: 400 }
  );
}

export function notFound(message = "Záznam nebol nájdený"): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

export function serverError(message = "Interná chyba servera"): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  );
}

export function success<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data });
}

// Middleware wrappers

type HandlerWithAuth = (
  request: Request,
  context: { userId: string; userRole: string; params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

type HandlerWithAdmin = (
  request: Request,
  context: { userId: string; params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrapper pre autentifikované endpointy
 * Automaticky kontroluje session a pridáva userId do kontextu
 */
export function withAuth(handler: HandlerWithAuth) {
  return async (request: Request, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return unauthorized();
      }

      // Get user role
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      return handler(request, {
        userId: session.user.id,
        userRole: user?.role || "FREE_USER",
        params: context?.params,
      });
    } catch (error) {
      console.error("Auth middleware error:", error);
      return serverError();
    }
  };
}

/**
 * Wrapper pre admin endpointy
 * Kontroluje session a rolu ADMIN
 */
export function withAdmin(handler: HandlerWithAdmin) {
  return async (request: Request, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return unauthorized();
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        return forbidden();
      }

      return handler(request, {
        userId: session.user.id,
        params: context?.params,
      });
    } catch (error) {
      console.error("Admin middleware error:", error);
      return serverError();
    }
  };
}

/**
 * Validuje request body pomocou Zod schémy
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
      });
      return { error: badRequest("Validačná chyba", errors) };
    }
    return { error: badRequest("Neplatné dáta") };
  }
}

/**
 * Validuje query parametre pomocou Zod schémy
 */
export function validateQuery<T>(
  request: Request,
  schema: ZodSchema<T>
): { data: T } | { error: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const validated = schema.parse(params);
    return { data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = [];
        errors[path].push(issue.message);
      });
      return { error: badRequest("Neplatné parametre", errors) };
    }
    return { error: badRequest("Neplatné parametre") };
  }
}

/**
 * Try-catch wrapper pre handlery
 */
export function tryCatch(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  return handler().catch((error) => {
    console.error("API Error:", error);
    
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errors: error.errors },
        { status: error.statusCode }
      );
    }
    
    return serverError();
  });
}
