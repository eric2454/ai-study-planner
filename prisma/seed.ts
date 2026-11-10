import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const db = new PrismaClient();
async function seed() {
  if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO !== "true")
    throw new Error(
      "Seed requires SEED_DEMO=true in a non-production environment.",
    );
  const email = process.env.DEMO_EMAIL || "student@studyplanner.local";
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 10)
    throw new Error("Set DEMO_PASSWORD (10+ characters).");
  if (await db.user.findUnique({ where: { email } }))
    throw new Error("Demo user already exists; no data was changed.");
  const user = await db.user.create({
    data: {
      name: "Ернұр",
      email,
      passwordHash: await hash(password, 12),
      university: "Университет",
      year: 3,
      onboarded: true,
      settings: { create: {} },
      subjects: {
        create: [
          { name: "Бағдарламалау", color: "#8b7bd0", icon: "code" },
          { name: "Математика", color: "#6b9cc8", icon: "calculator" },
          { name: "Деректер базасы", color: "#69aa93", icon: "book" },
        ],
      },
    },
    include: { subjects: true },
  });
  for (const [i, subject] of user.subjects.entries())
    await db.task.create({
      data: {
        userId: user.id,
        subjectId: subject.id,
        title: ["Зертханалық жұмыс", "Есептер жинағы", "Жобаның сызбасы"][i],
        deadline: new Date(Date.now() + (i + 2) * 86400000),
        estimatedMinutes: [90, 120, 60][i],
        priority: i === 0 ? "HIGH" : "MEDIUM",
        difficulty: i === 1 ? "HARD" : "MEDIUM",
      },
    });
  console.log(
    `Created isolated demo account: ${email}. No demo records are shared with other users.`,
  );
}
seed().finally(() => db.$disconnect());
