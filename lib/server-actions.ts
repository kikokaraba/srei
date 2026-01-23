import { z } from "zod";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/**
 * Wrapper for server actions with authentication and validation
 */
export async function withAuth<T>(
  handler: (session: Session) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const result = await handler(session as Session);
    return { success: true, data: result };
  } catch (error) {
    console.error("Server action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Wrapper for server actions with Zod validation
 */
export async function withValidation<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (input: TInput, session: Session) => Promise<TOutput>
) {
  return async (
    input: unknown
  ): Promise<{ success: true; data: TOutput } | { success: false; error: string }> => {
    try {
      const session = await auth();
      if (!session) {
        return { success: false, error: "Unauthorized" };
      }

      const validated = schema.safeParse(input);
      if (!validated.success) {
        return {
          success: false,
          error: validated.error.errors.map((e) => e.message).join(", "),
        };
      }

      const result = await handler(validated.data, session as Session);
      return { success: true, data: result };
    } catch (error) {
      console.error("Server action error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };
}
