import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { rateLimit } from "./rate-limit";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 86400 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        remember: { type: "text" },
      },
      async authorize(raw) {
        const parsed = z
          .object({
            email: z.email().toLowerCase(),
            password: z.string().min(1).max(128),
            remember: z.string().optional(),
          })
          .safeParse(raw);
        if (!parsed.success) return null;
        await rateLimit(`login:${parsed.data.email}`, 10);
        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        // Constant-cost comparison also for unknown accounts.
        const valid = await compare(
          parsed.data.password,
          user?.passwordHash ??
            "$2b$12$vDk9hF4Ywkyv1xJ4M2FpQeDCUKM3WvPB5vXcJwCBX0q9K1JfQh4Aa",
        );
        if (!user || !valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          version: user.sessionVersion,
          remember: parsed.data.remember === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.version = (user as unknown as { version: number }).version;
        token.until =
          Date.now() +
          ((user as unknown as { remember: boolean }).remember ? 30 : 1) *
            86400000;
      }
      return token;
    },
    async session({ session, token }) {
      const user =
        typeof token.uid === "string" && Number(token.until) > Date.now()
          ? await db.user.findUnique({
              where: { id: token.uid },
              select: { id: true, sessionVersion: true },
            })
          : null;
      if (user && user.sessionVersion === token.version)
        session.user = { ...session.user, id: user.id };
      else session.user = undefined;
      return session;
    },
  },
};
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}
