ALTER TABLE "Task" ADD CONSTRAINT "Task_positive_estimate" CHECK ("estimatedMinutes" BETWEEN 5 AND 6000);
ALTER TABLE "Notification" ADD COLUMN "dismissed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_valid_range" CHECK ("end" > "start");
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_valid_range" CHECK ("end" > "start");
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_valid_duration" CHECK ("duration" BETWEEN 1 AND 180 AND "elapsedSeconds" >= 0);
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_valid_window" CHECK ("endTime" > "startTime" AND "dailyMinutes" BETWEEN 15 AND 720 AND "sessionMinutes" BETWEEN 15 AND 180 AND "breakMinutes" BETWEEN 0 AND 60);
