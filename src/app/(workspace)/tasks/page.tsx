import { Suspense } from "react";
import { Tasks } from "@/components/tasks";
export default function Page() {
  return (
    <Suspense>
      <Tasks />
    </Suspense>
  );
}
