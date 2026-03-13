"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, RefreshCw } from "lucide-react";

interface ShortageData {
  transferId: string;
  transferNumber: string;
  originLocationId: string;
  destLocationId: string;
  transferDate: string;
  itemId: string;
  unitId: string | null;
  sentQty: string | number;
  receivedQty: string | number;
  shortage: string | number;
}

interface ShortageClientProps {
  tenantSlug: string;
}

function formatQty(v: string | number | null | undefined): string {
  if (v == null) return "0";
  const n = Number(v);
  return isNaN(n) ? "0" : n % 1 === 0 ? n.toString() : n.toFixed(3);
}

export function ShortageClient({ tenantSlug }: ShortageClientProps) {
  const [shortages, setShortages] = useState<ShortageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchShortages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/shortage-tracking?limit=200`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setShortages(json.data ?? []);
    } catch {
      toast.error("Failed to load shortage data");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchShortages();
  }, [fetchShortages]);

  const totalShortageItems = shortages.filter((s) => Number(s.shortage) > 0).length;
  const totalShortageQty = shortages.reduce((acc, s) => acc + Number(s.shortage), 0);

  const columns: ColumnDef<ShortageData>[] = [
    {
      accessorKey: "transferNumber",
      header: "Transfer #",
      cell: ({ getValue }) => (
        <span
          style={{ fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 700 }}
          className="text-[13px]"
        >
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "originLocationId",
      header: "From Location",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }} className="text-[12px]">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "destLocationId",
      header: "To Location",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }} className="text-[12px]">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "itemId",
      header: "Item ID",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }} className="text-[12px]">
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "sentQty",
      header: "Sent",
      size: 90,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-primary)" }} className="text-[13px]">
          {formatQty(getValue() as string | number)}
        </span>
      ),
    },
    {
      accessorKey: "receivedQty",
      header: "Received",
      size: 100,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--green)" }} className="text-[13px]">
          {formatQty(getValue() as string | number)}
        </span>
      ),
    },
    {
      accessorKey: "shortage",
      header: "Shortage",
      size: 110,
      cell: ({ getValue }) => {
        const v = Number(getValue());
        if (v <= 0) {
          return (
            <span style={{ color: "var(--green)" }} className="text-[12px]">
              None
            </span>
          );
        }
        return (
          <Badge variant="type-shortage">
            {formatQty(v)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "transferDate",
      header: "Date",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)" }} className="text-[12px]">
          {new Date(getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{ color: "var(--text-primary)" }} className="text-[22px] font-bold">
            Shortage Tracking
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            View shortages detected during transfer receipts.
          </p>
        </div>
        <Button variant="outline" size="default" onClick={fetchShortages} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Transfers",
            value: new Set(shortages.map((s) => s.transferId)).size,
            color: "var(--text-primary)",
          },
          {
            label: "Items with Shortage",
            value: totalShortageItems,
            color: totalShortageItems > 0 ? "var(--accent-color)" : "var(--text-primary)",
          },
          {
            label: "Total Shortage Qty",
            value: formatQty(totalShortageQty),
            color: totalShortageQty > 0 ? "var(--accent-color)" : "var(--text-primary)",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: "var(--card-radius)",
            }}
            className="flex flex-col gap-1 p-4"
          >
            <span
              style={{ color: "var(--text-muted)" }}
              className="text-[12px] font-bold uppercase tracking-[0.06em]"
            >
              {card.label}
            </span>
            <span style={{ color: card.color }} className="text-[24px] font-bold">
              {loading ? "—" : card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
          style={{ color: "var(--text-dim)" }}
        />
        <Input
          placeholder="Search by transfer number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={shortages}
          searchValue={search}
          pageSize={25}
          emptyMessage="No shortage records found. Shortages are recorded when received quantities are less than sent quantities."
        />
      )}
    </div>
  );
}
