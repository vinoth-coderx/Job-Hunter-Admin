import type { IconName } from "@/components/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Reserved for future surfaces that ship UI before backend. */
  pending?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/overview", icon: "home" },
      { label: "System Health", href: "/health", icon: "pulse" },
    ],
  },
  {
    label: "Operate",
    items: [
      { label: "Users", href: "/users", icon: "users" },
      { label: "Subscriptions", href: "/subscriptions", icon: "creditCard" },
      { label: "Jobs & Sources", href: "/jobs", icon: "briefcase" },
      { label: "Crons", href: "/crons", icon: "clock" },
    ],
  },
  {
    label: "Configure",
    items: [
      { label: "App Config", href: "/config", icon: "sliders" },
      { label: "AI Providers", href: "/ai", icon: "spark" },
    ],
  },
];
