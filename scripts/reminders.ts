import { createReminders } from "../src/lib/reminders";
import { db } from "../src/lib/db";
createReminders().finally(() => db.$disconnect());
