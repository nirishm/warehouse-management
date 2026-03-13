"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./tenant-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export function MobileHeader() {
  const { userEmail, role } = useTenant();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  return (
    <header
      style={{
        height: "var(--mobile-header-h)",
        backgroundColor: "var(--bg-base)",
        borderBottom: "1px solid var(--border)",
      }}
      className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4"
    >
      {/* Wordmark */}
      <div className="flex items-center gap-1.5">
        <svg
          width="22"
          height="20"
          viewBox="0 0 64 58"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="6" y="43" width="52" height="15" rx="5" fill="#E8520A" />
          <rect x="13" y="28" width="38" height="13" rx="4" fill="#F07030" />
          <rect x="20" y="14" width="24" height="13" rx="4" fill="#F5A472" opacity="0.9" />
          <rect x="26" y="2" width="12" height="11" rx="3" fill="#FAC8A8" opacity="0.75" />
        </svg>
        <span
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          className="text-[16px] font-bold"
        >
          WareOS
        </span>
      </div>

      {/* Avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            style={{
              backgroundColor: "var(--accent-tint)",
              color: "var(--accent-color)",
              borderRadius: "9999px",
              width: "28px",
              height: "28px",
            }}
            className="flex items-center justify-center text-[10px] font-bold shrink-0"
            aria-label="User menu"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
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
