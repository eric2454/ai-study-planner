import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getData, type ClientData } from "@/lib/data";
import { WorkspaceProvider } from "@/components/workspace-context";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const data = await getData(session.user.id);
  return (
    <WorkspaceProvider initial={JSON.parse(JSON.stringify(data)) as ClientData}>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
