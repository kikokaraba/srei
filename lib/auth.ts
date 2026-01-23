import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
          return null;
        }

        // Validate input
        const validated = credentialsSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!validated.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: validated.data.email },
        });

        if (!user) {
          return null;
        }

        // In production, verify password hash here
        // For MVP, we'll use a simple check
        // const isValid = await compare(validated.data.password, user.password);
        // if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        };
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
  secret: process.env.NEXTAUTH_SECRET,
});
