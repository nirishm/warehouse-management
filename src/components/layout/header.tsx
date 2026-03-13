"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./tenant-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { GlobalSearch } from "@/components/search/global-search";

export function Header() {
  const { userEmail, role } = useTenant();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Display initials from email
  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header
      style={{
        height: "var(--header-h)",
        backgroundColor: "var(--bg-base)",
        borderBottom: "1px solid var(--border)",
      }}
      className="hidden md:flex sticky top-0 z-40 items-center px-[var(--content-px)] gap-3"
    >
      {/* Mobile menu trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[var(--sidebar-w)]">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search trigger */}
      <button
        style={{
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--text-muted)",
          backgroundColor: "var(--bg-off)",
        }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-[13px] transition-colors hover:border-[var(--border-mid)]"
        onClick={() => setSearchOpen(true)}
        aria-label="Search (⌘K)"
      >
        <Search className="size-3.5 shrink-0" />
        <span>Search</span>
        <span
          style={{
            color: "var(--text-dim)",
            border: "1px solid var(--border-mid)",
            borderRadius: "4px",
          }}
          className="ml-1 px-1 py-0.5 text-[11px]"
        >
          ⌘K
        </span>
      </button>

      {/* Mobile search icon */}
      <button
        className="md:hidden"
        style={{ color: "var(--text-muted)" }}
        aria-label="Search"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="size-5" />
      </button>

      {/* Global Search dialog */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            style={{
              backgroundColor: "var(--accent-tint)",
              color: "var(--accent-color)",
              borderRadius: "9999px",
              width: "36px",
              height: "36px",
            }}
            className="flex items-center justify-center text-[13px] font-bold shrink-0 hover:opacity-80 transition-opacity"
            aria-label="User menu"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-400">
            <div className="flex flex-col gap-0.5">
              <span
                style={{ color: "var(--text-primary)" }}
                className="text-[13px] font-bold truncate"
              >
                {userEmail}
              </span>
              <span
                style={{
                  color: "var(--accent-color)",
                  backgroundColor: "var(--accent-tint)",
                  borderRadius: "4px",
                  padding: "1px 6px",
                  display: "inline-block",
                  width: "fit-content",
                }}
                className="text-[11px] font-bold capitalize"
              >
                {role}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => {}}
          >
            <User className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            className="gap-2 cursor-pointer"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="size-4" />
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
