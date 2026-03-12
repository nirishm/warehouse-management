"use client";
import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);

    // Check initial state
    setOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      style={{ background: "var(--red)", color: "#fff" }}
      className="fixed top-0 left-0 right-0 z-[9999] text-center py-2 text-[13px] font-bold"
    >
      You&apos;re offline. Some features may not be available.
    </div>
  );
}
