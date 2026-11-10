"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ListTodo,
  BookOpen,
  Sparkles,
  CalendarDays,
  ChartNoAxesCombined,
  Timer,
  MessageCircle,
  Settings,
  User,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  Moon,
  Sun,
  PanelLeftClose,
  ArrowUpRight,
  Check,
  Trash2,
  Database,
} from "lucide-react";
import { useI18n } from "./providers";
import { useWorkspace } from "./workspace-context";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./landing";
import { TaskModal } from "./tasks";
import { Modal } from "./ui/dialog";
const nav = [
  {
    label: "workspace",
    items: [
      ["dashboard", "/dashboard", LayoutDashboard],
      ["tasks", "/tasks", ListTodo],
      ["subjects", "/subjects", BookOpen],
      ["calendar", "/calendar", CalendarDays],
      ["dataManager", "/data", Database],
    ],
  },
  {
    label: "intelligence",
    items: [
      ["planner", "/ai-planner", Sparkles],
      ["focus", "/focus", Timer],
      ["analytics", "/analytics", ChartNoAxesCombined],
      ["assistant", "/ai-assistant", MessageCircle],
    ],
  },
  {
    label: "account",
    items: [
      ["profile", "/profile", User],
      ["settings", "/settings", Settings],
    ],
  },
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const { t, dark, setDark, date } = useI18n(),
    { data, mutate, setTaskModal, taskModal } = useWorkspace(),
    path = usePathname();
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [notify, setNotify] = useState(false),
    [profile, setProfile] = useState(false),
    [search, setSearch] = useState<string | null>(null);
  const selected =
    nav.map((g) => g.items.find((n) => n[1] === path)?.[0]).find(Boolean) ??
    "dashboard";
  const q = search?.toLowerCase() ?? "";
  const foundTasks = data.tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 12),
    foundSubjects = data.subjects
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 8),
    foundEvents = data.events
      .filter((e) => e.title.toLowerCase().includes(q))
      .slice(0, 8);
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button
        className={`mobile-scrim ${mobile ? "show" : ""}`}
        aria-label={t("close")}
        onClick={() => setMobile(false)}
      />
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button collapse-button"
            aria-label={t("close")}
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={17} />
          </button>
          <button
            className="mobile-only icon-button"
            aria-label={t("close")}
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-chip">
          <span className="avatar small">{data.user.name.slice(0, 1)}</span>
          <div>
            <strong>{data.user.name}</strong>
            <small>{data.user.university || t("workspace")}</small>
          </div>
        </div>
        <nav className="side-nav">
          {nav.map((group) => (
            <div key={group.label}>
              <p>{t(group.label)}</p>
              {group.items.map(([key, href, Icon]) => (
                <Link
                  key={href}
                  href={href}
                  title={t(key)}
                  onClick={() => setMobile(false)}
                  className={path === href ? "active" : ""}
                >
                  <Icon size={19} />
                  <span>{t(key)}</span>
                  {key === "planner" && <small>AI</small>}
                  {key === "tasks" && (
                    <b>
                      {
                        data.tasks.filter((x) => x.status !== "COMPLETED")
                          .length
                      }
                    </b>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="mini-orbit">
              <Sparkles size={19} />
            </span>
            <strong>{t("tagline")}</strong>
            <Link href="/ai-planner">
              {t("generate")}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <button
            className="logout"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={18} />
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="inline">
            <button
              className="icon-button mobile-only"
              aria-label={t("workspace")}
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              {t("workspace")}
              <span>/</span>
              <b>{t(selected)}</b>
            </span>
          </div>
          <div className="top-actions">
            <button className="top-search" onClick={() => setSearch("")}>
              <Search size={17} />
              <span>{t("search")}</span>
              <kbd>⌕</kbd>
            </button>
            <LanguageSwitch />
            <button
              className="icon-button"
              aria-label={t("theme")}
              onClick={() => {
                const value = !dark;
                setDark(value);
                if (data.user.settings)
                  void mutate(
                    {
                      action: "settings",
                      data: {
                        ...data.user.settings,
                        theme: value ? "dark" : "light",
                      },
                    },
                    true,
                  ).catch(() => {});
              }}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <div className="relative">
              <button
                className="icon-button"
                aria-label={t("notifications")}
                aria-expanded={notify}
                onClick={() => setNotify(!notify)}
              >
                <Bell size={20} />
                {data.notifications.some((n) => !n.read) && (
                  <span className="notification-dot" />
                )}
              </button>
              {notify && (
                <div className="notification-panel">
                  <div className="panel-title">
                    <b>{t("notifications")}</b>
                    <button
                      onClick={() =>
                        void mutate({ action: "readAll" }, true).catch(() => {})
                      }
                    >
                      {t("markAll")}
                    </button>
                  </div>
                  {!data.notifications.length && (
                    <p className="empty-small">{t("noNotifications")}</p>
                  )}
                  {data.notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification ${n.read ? "" : "unread"}`}
                    >
                      <Bell size={16} />
                      <div>
                        <small>
                          {t(
                            n.type === "deadline" ? "deadlineReminder" : n.type,
                          )}
                        </small>
                        <b>{n.title}</b>
                        <time>{date(n.createdAt)}</time>
                      </div>
                      {!n.read && (
                        <button
                          aria-label={t("markAll")}
                          onClick={() =>
                            void mutate(
                              { action: "readNotification", id: n.id },
                              true,
                            ).catch(() => {})
                          }
                        >
                          <Check size={15} />
                        </button>
                      )}
                      <button
                        aria-label={t("delete")}
                        onClick={() =>
                          void mutate(
                            { action: "deleteNotification", id: n.id },
                            true,
                          ).catch(() => {})
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className="profile-trigger"
                onClick={() => setProfile(!profile)}
                aria-label={t("profile")}
                aria-expanded={profile}
              >
                <span className="avatar">{data.user.name.slice(0, 1)}</span>
                <ChevronDown size={14} />
              </button>
              {profile && (
                <div className="profile-menu">
                  <strong>{data.user.name}</strong>
                  <small>{data.user.email}</small>
                  <Link href="/profile" onClick={() => setProfile(false)}>
                    {t("profile")}
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: "/login" })}>
                    {t("logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="workspace-main">{children}</main>
        <footer className="workspace-footer">
          <span>AI Study Planner</span>
          <span>{t("tagline")}</span>
          <Link href="/privacy">{t("privacy")}</Link>
        </footer>
      </div>
      <TaskModal id={taskModal} onClose={() => setTaskModal(null)} />
      <Modal
        open={search !== null}
        onClose={() => setSearch(null)}
        title={t("search")}
      >
        <input
          autoFocus
          value={search ?? ""}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
        />
        <div className="search-results">
          {q && (
            <>
              {foundTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    setTaskModal(task.id);
                    setSearch(null);
                  }}
                >
                  <ListTodo size={17} />
                  {task.title}
                  <small>{t("tasks")}</small>
                </button>
              ))}
              {foundSubjects.map((s) => (
                <Link
                  key={s.id}
                  href={`/tasks?subject=${s.id}`}
                  onClick={() => setSearch(null)}
                >
                  <BookOpen size={17} />
                  {s.name}
                  <small>{t("subjects")}</small>
                </Link>
              ))}
              {foundEvents.map((e) => (
                <Link
                  key={e.id}
                  href={`/calendar?date=${e.start.slice(0, 10)}`}
                  onClick={() => setSearch(null)}
                >
                  <CalendarDays size={17} />
                  {e.title}
                  <small>{t("calendar")}</small>
                </Link>
              ))}
              {!foundTasks.length &&
                !foundSubjects.length &&
                !foundEvents.length && <p>{t("emptySearch")}</p>}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
