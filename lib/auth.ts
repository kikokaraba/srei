import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { compare } from "bcryptjs";
import type { UserRole } from "@/generated/prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Adapter not needed for JWT strategy with Credentials provider
  // If you need database sessions later, uncomment and fix version compatibility:
  // adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Auth: Missing credentials");
          return null;
        }

        // Validate input
        const validated = credentialsSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!validated.success) {
          console.log("Auth: Validation failed", validated.error);
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: validated.data.email },
          });

          if (!user) {
            console.log("Auth: User not found", validated.data.email);
            return null;
          }

          // Verify password if user has one
          if (user.password) {
            const isValid = await compare(validated.data.password, user.password);
            if (!isValid) {
              console.log("Auth: Invalid password for", validated.data.email);
              return null;
            }
          } else {
            // For users without password (legacy/demo), allow any password
            console.log("Auth: User without password, allowing access", validated.data.email);
          }

          console.log("Auth: User authenticated", user.email, user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
          };
        } catch (error) {
          console.error("Auth: Database error", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "id" in user && "role" in user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user = {
          ...session.user,
          id: String(token.id),
          role: token.role,
        };
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-key-change-in-production",
});
