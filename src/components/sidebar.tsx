"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Globe,
  Bot,
  Settings,
  Target,
} from "lucide-react";
import { useAgentStats } from "@/lib/agent-data/hooks";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/performance", label: "Performance", icon: BarChart3 },
  { href: "/dashboard/moltbook", label: "Moltbook", icon: Globe },
  { href: "/dashboard/scout", label: "Scout", icon: Target },
  { href: "/dashboard/agent", label: "Agent", icon: Bot },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useAgentStats();

  const agentName = data?.identity?.agentName ?? "Agent";
  const isOnline = data?.identity?.status === "online";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-accent">Claw</span>
          <span className="text-text">Staff</span>
        </h1>
        <p className="text-xs text-text-muted mt-1 font-mono">AI AGENT FRAMEWORK</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Bot size={16} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-text">{agentName}</p>
            <p className={`text-xs font-mono ${isOnline ? "text-green-400" : "text-red-400"}`}>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
