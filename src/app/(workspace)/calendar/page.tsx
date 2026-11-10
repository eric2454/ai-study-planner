import { Suspense } from "react";
import { StudyCalendar } from "@/components/study-calendar";
export default function Page() {
  return (
    <Suspense>
      <StudyCalendar />
    </Suspense>
  );
}
