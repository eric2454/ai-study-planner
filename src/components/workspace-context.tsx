"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { toast } from "sonner";
import type { ClientData } from "@/lib/data";
import { useI18n } from "./providers";
type Mutation = Record<string, unknown>;
type Workspace = {
  data: ClientData;
  refresh: () => Promise<void>;
  mutate: (body: Mutation, quiet?: boolean) => Promise<Record<string, unknown>>;
  busy: boolean;
  taskModal: string | null;
  setTaskModal: (id: string | null) => void;
};
const C = createContext<Workspace>(null!);
export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: ClientData;
  children: React.ReactNode;
}) {
  const [data, setData] = useState(initial),
    [busy, setBusy] = useState(false),
    [taskModal, setTaskModal] = useState<string | null>(null);
  const { t, setLang, setDark, setTimezone } = useI18n();
  useEffect(() => {
    const s = initial.user.settings;
    if (s) {
      setLang(s.language as "kk" | "ru" | "en");
      setDark(s.theme === "dark");
      setTimezone(s.timezone);
    }
  }, [initial, setLang, setDark, setTimezone]);
  const refresh = useCallback(async () => {
    const res = await fetch("/api/workspace", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh());
    const interval = setInterval(() => void refresh(), 60000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [refresh]);
  const mutate = async (body: Mutation, quiet = false) => {
    setBusy(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      await refresh();
      if (!quiet) toast.success(t("saved"));
      return result;
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "serverError"));
      throw e;
    } finally {
      setBusy(false);
    }
  };
  return (
    <C.Provider
      value={{ data, refresh, mutate, busy, taskModal, setTaskModal }}
    >
      {children}
    </C.Provider>
  );
}
export const useWorkspace = () => useContext(C);
