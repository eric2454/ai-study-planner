import { db } from "./db";
import { createHash } from "node:crypto";
export async function rateLimit(key: string, limit = 10, windowSeconds = 900) {
  const hash = createHash("sha256").update(key).digest("hex");
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key","count","expires") VALUES (${hash},1,NOW()+${windowSeconds}*INTERVAL '1 second') ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expires"<NOW() THEN 1 ELSE "RateLimit"."count"+1 END,"expires"=CASE WHEN "RateLimit"."expires"<NOW() THEN NOW()+${windowSeconds}*INTERVAL '1 second' ELSE "RateLimit"."expires" END RETURNING "count"`;
  if (rows[0].count > limit) throw new Error("rateLimited");
}
