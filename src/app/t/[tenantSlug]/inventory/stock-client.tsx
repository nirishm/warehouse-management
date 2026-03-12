"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface StockLevel {
  itemId: string;
  locationId: string;
  unitId: string;
  totalIn: string | number;
  totalOut: string | number;
  currentStock: string | number;
  inTransit: string | number;
}

interface StockClientProps {
  tenantSlug: string;
}

function formatQty(v: string | number | undefined | null): string {
  if (v == null) return "0";
  const n = Number(v);
  return isNaN(n) ? "0" : n % 1 === 0 ? n.toString() : n.toFixed(3);
}

export function StockClient({ tenantSlug }: StockClientProps) {
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/t/${tenantSlug}/inventory?limit=500`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setStock(json.data ?? []);
    } catch {
      toast.error("Failed to load stock levels");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const columns: ColumnDef<StockLevel>[] = [
    {
      accessorKey: "itemId",
      header: "Item ID",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-muted)", fontFamily: "monospace" }}
          className="text-[12px]"
        >
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "locationId",
      header: "Location ID",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-muted)", fontFamily: "monospace" }}
          className="text-[12px]"
        >
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "unitId",
      header: "Unit ID",
      cell: ({ getValue }) => (
        <span
          style={{ color: "var(--text-muted)", fontFamily: "monospace" }}
          className="text-[12px]"
        >
          {(getValue() as string).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "totalIn",
      header: "Total In",
      size: 100,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--green)" }} className="text-[13px] font-bold">
          +{formatQty(getValue() as string | number)}
        </span>
      ),
    },
    {
      accessorKey: "totalOut",
      header: "Total Out",
      size: 100,
      cell: ({ getValue }) => (
        <span style={{ color: "var(--red)" }} className="text-[13px] font-bold">
          -{formatQty(getValue() as string | number)}
        </span>
      ),
    },
    {
      accessorKey: "currentStock",
      header: "Current Stock",
      size: 130,
      cell: ({ getValue }) => {
        const v = Number(getValue());
        const isLow = v <= 0;
        return (
          <span
            style={{
              color: isLow ? "var(--red)" : "var(--text-primary)",
              fontWeight: 700,
            }}
            className="text-[14px]"
          >
            {formatQty(getValue() as string | number)}
          </span>
        );
      },
    },
    {
      accessorKey: "inTransit",
      header: "In Transit",
      size: 110,
      cell: ({ getValue }) => {
        const v = Number(getValue());
        return (
          <span
            style={{ color: v > 0 ? "var(--accent-color)" : "var(--text-dim)" }}
            className="text-[13px]"
          >
            {formatQty(getValue() as string | number)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1
            style={{ color: "var(--text-primary)" }}
            className="text-[22px] font-bold"
          >
            Inventory Stock Levels
          </h1>
          <p style={{ color: "var(--text-muted)" }} className="text-[13px] mt-0.5">
            Real-time stock levels aggregated across all locations.
          </p>
        </div>
        <Button
          variant="outline"
          size="default"
          onClick={fetchStock}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total SKUs",
            value: new Set(stock.map((s) => s.itemId)).size,
            color: "var(--text-primary)",
          },
          {
            label: "Total Locations",
            value: new Set(stock.map((s) => s.locationId)).size,
            color: "var(--text-primary)",
          },
          {
            label: "Zero Stock",
            value: stock.filter((s) => Number(s.currentStock) <= 0).length,
            color: "var(--red)",
          },
          {
            label: "In Transit",
            value: stock.filter((s) => Number(s.inTransit) > 0).length,
            color: "var(--accent-color)",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--bg-base)",
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
            <span
              style={{ color: card.color }}
              className="text-[24px] font-bold"
            >
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
          placeholder="Filter by item or location ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={stock}
          searchValue={search}
          pageSize={25}
          emptyMessage="No stock data found. Stock levels are calculated from purchase receipts and sales dispatches."
        />
      )}
    </div>
  );
}
