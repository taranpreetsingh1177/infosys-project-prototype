"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiArrowDownSLine,
  RiSearchLine,
  RiUserLine,
} from "@remixicon/react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [{ title: "Patients", icon: RiUserLine, href: "/" }];

interface AppSidebarProps {
  patientName?: string;
  sessionLabel?: string;
  patientHref?: string;
}

export function AppSidebar({
  patientName,
  sessionLabel,
  patientHref,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="font-medium">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                CW
              </span>
              <span>Clinical Workspace</span>
              <RiArrowDownSLine className="ml-auto text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="relative">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput placeholder="Search patients" className="pl-8" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.href === "/" && pathname === "/"}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {patientName && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Private</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={Boolean(sessionLabel)}
                      render={
                        patientHref ? <Link href={patientHref} /> : undefined
                      }
                    >
                      <RiUserLine />
                      <span className="truncate">
                        {sessionLabel ?? patientName}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
