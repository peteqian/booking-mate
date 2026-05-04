import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getCurrentOrg, type CurrentOrgResponse } from "@/lib/org";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  PanelLeft,
  Settings,
  Ticket,
  User,
  Users,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: string;
  /** Actions rendered on the right side of the page header. Passed from the main content component. */
  headerActions?: React.ReactNode;
}

const workspaceNavItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Events", to: "/events/", icon: Ticket },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Resources", to: "/resources", icon: ListChecks },
  { label: "Attendees", to: "/attendees", icon: Users },
] as const;

export function AppShell({ children, title, description, headerActions }: AppShellProps) {
  const location = useLocation();
  const [orgContext, setOrgContext] = useState<CurrentOrgResponse | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("sidebar-collapsed", String(next));
  };

  useEffect(() => {
    let active = true;

    async function loadShellData() {
      const [session, org] = await Promise.allSettled([authClient.getSession(), getCurrentOrg()]);

      if (!active) return;
      if (session.status === "fulfilled") {
        setEmail(session.value.data?.user.email ?? null);
      }
      if (org.status === "fulfilled") setOrgContext(org.value);
    }

    void loadShellData();
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className={`flex ${collapsed ? "w-14" : "w-64"} flex-shrink-0 flex-col border-r bg-background transition-all duration-200`}>
        {/** @philosophy The sidebar header never has a bottom border. Visual separation from nav items is handled by whitespace. Never add border-bottom here. */}
        {!collapsed ? (
          <div className="flex h-12 w-full items-center justify-between px-3">
            <Link
              to="/"
              title="Dashboard"
              className="flex size-8 items-center justify-center rounded-lg border bg-background text-sm font-semibold shadow-xs transition-colors hover:bg-muted"
            >
              B
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-[-0.02em]">Booking Mate</p>
              {orgContext?.org.name && (
                <p className="truncate text-xs text-muted-foreground">{orgContext.org.name}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={toggleSidebar}
              title="Collapse sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex h-12 w-full items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={toggleSidebar}
              title="Expand sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          {workspaceNavItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={`flex h-9 items-center gap-3 rounded-lg text-sm transition-colors ${
                  collapsed ? "justify-center px-2" : "px-3"
                } ${
                  active
                    ? "border border-ring bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          {orgContext?.org.slug && (
            <Link
              to="/$orgSlug/settings"
              params={{ orgSlug: orgContext.org.slug }}
              title="Organization settings"
              aria-label="Organization settings"
              className={`flex h-9 items-center gap-3 rounded-lg text-sm transition-colors ${
                collapsed ? "justify-center px-2" : "px-3"
              } ${
                location.pathname === `/${orgContext.org.slug}/settings`
                  ? "border border-ring bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Settings className="size-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">Organization settings</span>}
            </Link>
          )}
        </nav>

        <div className="flex flex-col gap-2 border-t px-2 py-3">
          <Link
            to="/settings"
            title={email ?? "User settings"}
            aria-label="User settings"
            className={`flex h-9 items-center gap-3 rounded-lg text-sm transition-colors ${
              collapsed ? "justify-center px-2" : "px-3"
            } ${
              location.pathname === "/settings"
                ? "border border-ring bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-[0.65rem] text-background">
              {email ? email[0]?.toUpperCase() : <User className="size-3" />}
            </span>
            {!collapsed && <span className="truncate">User settings</span>}
          </Link>
          <Button
            variant="ghost"
            title="Sign out"
            aria-label="Sign out"
            onClick={handleSignOut}
            className={`h-9 gap-3 px-3 text-muted-foreground hover:text-foreground ${
              collapsed ? "justify-center" : "justify-start"
            }`}
          >
            <span className="text-xs flex-shrink-0">↧</span>
            {!collapsed && <span className="truncate">Sign out</span>}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/** @philosophy The main page header never has a bottom border. The separation between header and content is created by whitespace and visual hierarchy, not lines. Never add border-bottom here. */}
        <header className="flex h-12 flex-shrink-0 items-center justify-between bg-background/90 px-5 backdrop-blur supports-backdrop-filter:bg-background/75">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              {title && (
                <h1 className="truncate text-sm font-medium tracking-[-0.02em]">{title}</h1>
              )}
              {description && <p className="sr-only">{description}</p>}
            </div>
            {orgContext?.org.name && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                · {orgContext.org.name}
              </span>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4 pb-10 sm:px-8 lg:pt-6 lg:pb-14">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
