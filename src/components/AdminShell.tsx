// AdminShell — port of airrun-design/project/admin-shell.jsx (Sidebar + TopBar).
// Faithful to the design's pixel dimensions (220/56 sidebar, 52px topbar) and
// active-state styling (mint bg + 2px brand-green left border + bold green icon).
//
// Wired to react-router via NavLink rather than the design's local-state nav
// because we already have routes set up.

import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { IC, AirrunIcon, AirrunLogo } from "./icons";

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
  end?: boolean;
  badge?: number | null;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: "/", label: "Overview", icon: IC.dashboard, end: true }] },
  {
    label: "Content",
    items: [
      { to: "/parks", label: "Parks", icon: IC.parks },
      { to: "/users", label: "Users", icon: IC.users },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/reports", label: "Park Reports", icon: IC.reports, badge: null },
      { to: "/bugs", label: "Bugs", icon: IC.bugs, badge: null },
      { to: "/feedback", label: "Feedback", icon: IC.feedback, badge: null },
    ],
  },
  {
    label: "Admin",
    items: [{ to: "/settings", label: "Settings", icon: IC.settings }],
  },
];

function initialsFor(email: string | null): string {
  if (!email) return "AW";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return (email[0] ?? "?").toUpperCase();
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
}

function Sidebar({
  collapsed,
  email,
  onSignOut,
}: {
  collapsed: boolean;
  email: string | null;
  onSignOut: () => void;
}) {
  return (
    <aside
      style={{
        width: collapsed ? 56 : 220,
        background: "#fff",
        borderRight: "1px solid #EDF0F3",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        transition: "width 0.18s",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? "14px 0" : 0,
          borderBottom: "1px solid #EDF0F3",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          background: collapsed ? "transparent" : "#17202A",
          minHeight: 56,
        }}
      >
        {collapsed ? (
          <AirrunIcon size={28} />
        ) : (
          <div
            style={{
              width: "100%",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "rgb(0, 220, 154)",
            }}
          >
            <AirrunLogo />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#61D0AB",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.9,
              }}
            >
              admin
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {!collapsed && group.label && (
              <div
                style={{
                  padding: "10px 16px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#B6C7D6",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "9px 0" : "9px 16px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? "#F0FDF8" : "transparent",
                  border: "none",
                  borderLeft:
                    isActive && !collapsed
                      ? "2px solid #04DC9A"
                      : "2px solid transparent",
                  cursor: "pointer",
                  borderRadius: collapsed ? 0 : "0 6px 6px 0",
                  color: isActive ? "#0A6E4E" : "#555B63",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.1s",
                  textDecoration: "none",
                })}
              >
                {({ isActive }) => (
                  <>
                    <span
                      style={{
                        color: isActive ? "#04DC9A" : "#777D86",
                        display: "flex",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ flex: 1, textAlign: "left" }}>
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.badge != null && item.badge > 0 && (
                      <span
                        style={{
                          background: "#EF4B4B",
                          color: "#fff",
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "1px 6px",
                          minWidth: 18,
                          textAlign: "center",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Admin user footer */}
      <div
        style={{
          padding: collapsed ? "12px 0" : "12px 16px",
          borderTop: "1px solid #EDF0F3",
          display: "flex",
          alignItems: "center",
          gap: 9,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#04DC9A22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#04A074" }}>
            {initialsFor(email)}
          </span>
        </div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#24262B",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={email ?? undefined}
            >
              {email ?? "Admin"}
            </div>
            <div style={{ fontSize: 11, color: "#777D86" }}>Super Admin</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onSignOut}
            title="Sign out"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#B6C7D6",
              display: "flex",
              cursor: "pointer",
            }}
          >
            {IC.logout}
          </button>
        )}
      </div>
    </aside>
  );
}

function TopBar({
  sidebarW,
  onToggleSidebar,
  search,
  onSearch,
}: {
  sidebarW: number;
  onToggleSidebar: () => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);

  // Sample notification items — design treats these as decorative for v1
  // (no notification backend yet).
  const notifs: { text: ReactNode; time: string; dot: string }[] = [
    {
      text: "New report on Sanam Luang — high severity",
      time: "7 min ago",
      dot: "#EF4B4B",
    },
    {
      text: "B003 escalated: Saved parks not persisting",
      time: "1 hr ago",
      dot: "#F7B731",
    },
    {
      text: "User feedback spike — 3 new items today",
      time: "2 hrs ago",
      dot: "#1888FF",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: sidebarW,
        right: 0,
        height: 52,
        background: "#fff",
        borderBottom: "1px solid #EDF0F3",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 12,
        zIndex: 50,
        transition: "left 0.18s",
      }}
    >
      <button
        onClick={onToggleSidebar}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#777D86",
          display: "flex",
          alignItems: "center",
          padding: 4,
          borderRadius: 6,
          flexShrink: 0,
        }}
        aria-label="Toggle sidebar"
      >
        {IC.menu}
      </button>

      {/* Global search — decorative for v1 (no global search backend). */}
      <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
        <span
          style={{
            position: "absolute",
            left: 9,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#777D86",
            pointerEvents: "none",
            display: "flex",
          }}
        >
          {IC.search}
        </span>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search parks, users, reports…"
          style={{
            fontFamily: "inherit",
            fontSize: 13,
            border: "1px solid #EDF0F3",
            borderRadius: 8,
            padding: "6px 10px 6px 30px",
            outline: "none",
            background: "#F7F8FA",
            color: "#24262B",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 4,
            background: "#F0FDF8",
            border: "1px solid #A7F3D0",
            fontSize: 11,
            fontWeight: 600,
            color: "#0A6E4E",
          }}
        >
          Production
        </span>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#777D86",
              display: "flex",
              alignItems: "center",
              padding: "6px 8px",
              borderRadius: 6,
              position: "relative",
            }}
            aria-label="Notifications"
          >
            {IC.bell}
            {notifs.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#EF4B4B",
                  border: "2px solid #fff",
                }}
              />
            )}
          </button>
          {notifOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 300,
                background: "#fff",
                border: "1px solid #EDF0F3",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                zIndex: 200,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #EDF0F3",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
                <button
                  onClick={() => setNotifOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#777D86",
                    display: "flex",
                  }}
                  aria-label="Close notifications"
                >
                  {IC.x}
                </button>
              </div>
              {notifs.map((n, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #EDF0F3",
                    display: "flex",
                    gap: 10,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F8FA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: n.dot,
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: "#24262B", lineHeight: 1.4 }}>
                      {n.text}
                    </div>
                    <div style={{ fontSize: 11, color: "#777D86", marginTop: 2 }}>
                      {n.time}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "10px 16px", textAlign: "center" }}>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "#777D86",
                  }}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin avatar */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#04DC9A22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <AirrunIcon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function AdminShell(): ReactNode {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const sidebarW = collapsed ? 56 : 220;

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = () => {
    void signOut().then(() => {
      navigate("/login");
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F8FA",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <Sidebar collapsed={collapsed} email={email} onSignOut={handleSignOut} />
      <TopBar
        sidebarW={sidebarW}
        onToggleSidebar={() => setCollapsed((v) => !v)}
        search={search}
        onSearch={setSearch}
      />
      <main
        style={{
          marginLeft: sidebarW,
          paddingTop: 52,
          minHeight: "100vh",
          transition: "margin-left 0.18s",
        }}
      >
        <div style={{ padding: "28px 28px", maxWidth: 1200 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
