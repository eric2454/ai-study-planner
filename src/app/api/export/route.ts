import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET() {
  try {
    const userId = await requireUser();
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        university: true,
        faculty: true,
        specialty: true,
        year: true,
        onboarded: true,
        createdAt: true,
        settings: true,
        subjects: true,
        tasks: true,
        plans: true,
        studySessions: true,
        events: true,
        focusSessions: true,
        notifications: true,
        chats: { include: { messages: true } },
      },
    });
    return new Response(JSON.stringify(user, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="study-planner-data.json"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
}
