import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Wrapper for server actions with authentication and validation
 */
export async function withAuth<T>(
  handler: (session: any) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const result = await handler(session);
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
  handler: (input: TInput, session: any) => Promise<TOutput>
) {
  return async (
    input: unknown
  ): Promise<{ success: true; data: TOutput } | { success: false; error: string }> => {
    try {
      const session = await getServerSession(authOptions);
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

      const result = await handler(validated.data, session);
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
