import { useState } from "react";
import {
  Home, Package, Truck, ShoppingCart, RotateCcw,
  BarChart3, CreditCard, FileText, Upload, QrCode,
  MapPin, Box, Users, ChevronDown, ChevronRight,
  Search, Bell, Menu, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Activity, Clock, Plus, Settings,
  Layers, SlidersHorizontal, TrendingUp, Eye,
  ChevronLeft, X, Building2
} from "lucide-react";

// ─── Design Tokens ───────────────────────────────────────
const T = {
  accent: "#F45F00",
  accentDark: "#C94F00",
  accentTint: "rgba(244,95,0,0.06)",
  orangeBg: "rgba(244,95,0,0.08)",
  bgBase: "#FFFFFF",
  bgOff: "#F5F5F3",
  bgInk: "#080808",
  textPrimary: "#000000",
  textBody: "#1C1C1C",
  textMuted: "#575757",
  textDim: "#A3A3A3",
  green: "#16A34A",
  greenBg: "rgba(22,163,74,0.08)",
  blue: "#2563EB",
  blueBg: "rgba(37,99,235,0.08)",
  red: "#DC2626",
  redBg: "rgba(220,38,38,0.08)",
  headerH: 60,
  sidebarW: 240,
  contentPx: 28,
};

// ─── Shared Styles ───────────────────────────────────────
const fonts = {
  serif: "'Georgia', serif",
  mono: "'SF Mono', 'Fira Code', monospace",
  sans: "'Inter', -apple-system, sans-serif",
};

// ─── Sidebar Nav Groups ──────────────────────────────────
const tenantNavGroups = [
  {
    label: "Operations",
    items: [
      { icon: ShoppingCart, label: "Purchases", badge: 3 },
      { icon: Truck, label: "Dispatches", badge: 5 },
      { icon: TrendingUp, label: "Sales" },
      { icon: RotateCcw, label: "Returns" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { icon: Package, label: "Stock Levels", active: false },
      { icon: Layers, label: "Lots" },
      { icon: AlertTriangle, label: "Shortages", badge: 2 },
      { icon: Bell, label: "Stock Alerts" },
      { icon: SlidersHorizontal, label: "Alert Thresholds" },
      { icon: Activity, label: "Adjustments", isNew: true },
    ],
  },
  {
    label: "Reports",
    items: [
      { icon: BarChart3, label: "Analytics" },
      { icon: CreditCard, label: "Payments" },
      { icon: FileText, label: "Audit Log" },
      { icon: Upload, label: "Import/Export" },
      { icon: QrCode, label: "Barcodes" },
    ],
  },
  {
    label: "Settings",
    items: [
      { icon: MapPin, label: "Locations" },
      { icon: Box, label: "Items" },
      { icon: Users, label: "Contacts" },
      { icon: Users, label: "Users" },
    ],
  },
];

const adminNavItems = [
  { icon: Home, label: "Overview", active: true },
  { icon: Building2, label: "Tenants" },
  { icon: Users, label: "Access Requests", badge: 4 },
  { icon: Settings, label: "Platform Settings" },
];

// ─── Components ──────────────────────────────────────────

function KPICard({ label, value, change, changeType, icon: Icon }) {
  const isUp = changeType === "up";
  return (
    <div style={{
      background: T.bgBase, borderRadius: 12, padding: 20,
      border: "1px solid rgba(0,0,0,0.05)", flex: "1 1 0",
      minWidth: 180,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            fontFamily: fonts.sans, fontSize: 12, color: T.textMuted,
            marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em",
          }}>{label}</div>
          <div style={{
            fontFamily: fonts.serif, fontSize: 28, color: T.textPrimary,
            letterSpacing: "-0.5px", fontWeight: 400,
          }}>{value}</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: T.accentTint, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={20} color={T.accent} />
        </div>
      </div>
      {change && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4, marginTop: 10,
          fontSize: 12, fontFamily: fonts.mono,
          color: isUp ? T.green : T.red,
        }}>
          {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{change}</span>
          <span style={{ color: T.textDim, fontFamily: fonts.sans, marginLeft: 4 }}>vs last week</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    received: { bg: T.greenBg, color: T.green },
    dispatched: { bg: T.orangeBg, color: T.accent },
    confirmed: { bg: T.blueBg, color: T.blue },
    pending: { bg: T.orangeBg, color: T.accent },
    active: { bg: T.greenBg, color: T.green },
    trial: { bg: T.orangeBg, color: T.accent },
    suspended: { bg: T.redBg, color: T.red },
  };
  const s = map[status] || { bg: T.bgOff, color: T.textMuted };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 9999,
      fontSize: 11, fontFamily: fonts.mono, fontWeight: 500,
      background: s.bg, color: s.color, textTransform: "capitalize",
    }}>{status}</span>
  );
}

function TypeBadge({ type }) {
  const map = {
    DISPATCH: { bg: T.orangeBg, color: T.accent },
    PURCHASE: { bg: T.blueBg, color: T.blue },
    SALE: { bg: T.greenBg, color: T.green },
    ADJUSTMENT: { bg: "rgba(0,0,0,0.04)", color: T.textMuted },
  };
  const s = map[type] || { bg: T.bgOff, color: T.textMuted };
  return (
    <span style={{
      display: "inline-block", padding: "3px 8px", borderRadius: 4,
      fontSize: 10, fontFamily: fonts.mono, fontWeight: 600,
      background: s.bg, color: s.color, letterSpacing: "0.06em",
    }}>{type}</span>
  );
}

function SidebarGroup({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", width: "100%",
        padding: "8px 16px", border: "none", background: "none",
        cursor: "pointer", fontFamily: fonts.sans, fontSize: 11,
        fontWeight: 600, color: T.textDim, textTransform: "uppercase",
        letterSpacing: "0.08em", gap: 4,
      }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {group.label}
      </button>
      {open && group.items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", padding: "8px 16px 8px 20px",
          gap: 10, cursor: "pointer", fontSize: 13.5, fontFamily: fonts.sans,
          color: item.active ? T.accent : T.textBody,
          background: item.active ? T.accentTint : "transparent",
          borderLeft: item.active ? `2px solid ${T.accent}` : "2px solid transparent",
          transition: "all 0.15s",
        }}>
          <item.icon size={17} color={item.active ? T.accent : T.textMuted} />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && (
            <span style={{
              background: T.accent, color: "#fff", borderRadius: 9999,
              fontSize: 10, fontFamily: fonts.mono, padding: "1px 7px",
              fontWeight: 600,
            }}>{item.badge}</span>
          )}
          {item.isNew && (
            <span style={{
              background: T.greenBg, color: T.green, borderRadius: 4,
              fontSize: 9, fontFamily: fonts.mono, padding: "1px 5px",
              fontWeight: 600, letterSpacing: "0.04em",
            }}>NEW</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tenant Dashboard ────────────────────────────────────
function TenantDashboard() {
  const transactions = [
    { id: "DSP-000042", type: "DISPATCH", from: "Warehouse A", to: "Godown B", status: "dispatched", time: "2h ago", qty: "120 bags" },
    { id: "PUR-000018", type: "PURCHASE", from: "Agri Traders", to: "Warehouse A", status: "received", time: "4h ago", qty: "500 bags" },
    { id: "SAL-000009", type: "SALE", from: "Warehouse A", to: "Metro Foods", status: "confirmed", time: "6h ago", qty: "200 bags" },
    { id: "ADJ-000003", type: "ADJUSTMENT", from: "Warehouse A", to: "—", status: "confirmed", time: "1d ago", qty: "-15 bags" },
    { id: "DSP-000041", type: "DISPATCH", from: "Godown B", to: "Warehouse C", status: "pending", time: "1d ago", qty: "80 bags" },
  ];

  const shortages = [
    { item: "Basmati Rice (1121)", location: "Warehouse A", current: 45, minimum: 100, unit: "bags" },
    { item: "Wheat Flour", location: "Godown B", current: 12, minimum: 50, unit: "bags" },
  ];

  const stockByLocation = [
    { location: "Warehouse A", items: 12, total: "2,450 bags", utilization: 78 },
    { location: "Godown B", items: 8, total: "1,120 bags", utilization: 45 },
    { location: "Warehouse C", items: 5, total: "680 bags", utilization: 32 },
  ];

  return (
    <div>
      {/* Filters Row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
        flexWrap: "wrap",
      }}>
        <select style={{
          height: 36, borderRadius: 8, border: `1px solid rgba(0,0,0,0.12)`,
          padding: "0 12px", fontFamily: fonts.sans, fontSize: 13,
          color: T.textBody, background: T.bgBase, cursor: "pointer",
        }}>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>This month</option>
        </select>
        <select style={{
          height: 36, borderRadius: 8, border: `1px solid rgba(0,0,0,0.12)`,
          padding: "0 12px", fontFamily: fonts.sans, fontSize: 13,
          color: T.textBody, background: T.bgBase, cursor: "pointer",
        }}>
          <option>All Locations</option>
          <option>Warehouse A</option>
          <option>Godown B</option>
        </select>
        <select style={{
          height: 36, borderRadius: 8, border: `1px solid rgba(0,0,0,0.12)`,
          padding: "0 12px", fontFamily: fonts.sans, fontSize: 13,
          color: T.textBody, background: T.bgBase, cursor: "pointer",
        }}>
          <option>All Items</option>
          <option>Basmati Rice</option>
          <option>Wheat Flour</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <KPICard label="Total Stock" value="4,250" icon={Package} change="+8.2%" changeType="up" />
        <KPICard label="Dispatches (7d)" value="12" icon={Truck} change="+3" changeType="up" />
        <KPICard label="Purchases (7d)" value="6" icon={ShoppingCart} change="-2" changeType="down" />
        <KPICard label="Shortages" value="2" icon={AlertTriangle} change="+1" changeType="down" />
      </div>

      {/* Two-column layout: Transactions + Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 24 }}>
        {/* Recent Transactions */}
        <div style={{
          background: T.bgBase, borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
              Recent Transactions
            </span>
            <button style={{
              background: "none", border: "none", color: T.accent,
              fontFamily: fonts.sans, fontSize: 12, cursor: "pointer", fontWeight: 500,
            }}>View all</button>
          </div>

          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "130px 90px 1fr 100px 80px 70px",
            padding: "10px 20px", borderBottom: "1px solid rgba(0,0,0,0.04)",
          }}>
            {["Number", "Type", "Route", "Qty", "Status", "Time"].map(h => (
              <span key={h} style={{
                fontFamily: fonts.mono, fontSize: 10, fontWeight: 500,
                color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em",
              }}>{h}</span>
            ))}
          </div>

          {transactions.map((tx, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "130px 90px 1fr 100px 80px 70px",
              padding: "11px 20px", borderBottom: "1px solid rgba(0,0,0,0.03)",
              alignItems: "center", cursor: "pointer",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bgOff}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{
                fontFamily: fonts.mono, fontSize: 12, fontWeight: 700,
                color: i === 0 ? T.accent : T.textBody,
              }}>{tx.id}</span>
              <TypeBadge type={tx.type} />
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: T.textBody }}>
                {tx.from} → {tx.to}
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: T.textBody }}>{tx.qty}</span>
              <StatusBadge status={tx.status} />
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: T.textDim }}>{tx.time}</span>
            </div>
          ))}
        </div>

        {/* Right column: Shortage Alerts + Stock by Location */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Shortage Alerts */}
          <div style={{
            background: T.bgBase, borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} color={T.red} />
                <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                  Shortage Alerts
                </span>
              </div>
              <span style={{
                background: T.redBg, color: T.red, borderRadius: 9999,
                fontSize: 11, fontFamily: fonts.mono, padding: "2px 8px", fontWeight: 600,
              }}>{shortages.length}</span>
            </div>
            {shortages.map((s, i) => (
              <div key={i} style={{
                padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.03)",
              }}>
                <div style={{
                  fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
                  color: T.textPrimary, marginBottom: 4,
                }}>{s.item}</div>
                <div style={{
                  fontFamily: fonts.sans, fontSize: 12, color: T.textMuted, marginBottom: 8,
                }}>{s.location}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    flex: 1, height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 3,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${(s.current / s.minimum) * 100}%`, height: "100%",
                      background: s.current / s.minimum < 0.3 ? T.red : T.accent,
                      borderRadius: 3,
                    }} />
                  </div>
                  <span style={{
                    fontFamily: fonts.mono, fontSize: 11, color: T.red, fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>{s.current}/{s.minimum} {s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stock by Location */}
          <div style={{
            background: T.bgBase, borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)",
            }}>
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                Stock by Location
              </span>
            </div>
            {stockByLocation.map((loc, i) => (
              <div key={i} style={{
                padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.03)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: T.accentTint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <MapPin size={16} color={T.accent} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
                    color: T.textPrimary, marginBottom: 2,
                  }}>{loc.location}</div>
                  <div style={{
                    fontFamily: fonts.sans, fontSize: 11, color: T.textMuted,
                  }}>{loc.items} items · {loc.total}</div>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `conic-gradient(${T.accent} ${loc.utilization * 3.6}deg, rgba(0,0,0,0.06) 0deg)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: T.bgBase,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: fonts.mono, fontSize: 11, fontWeight: 600, color: T.textBody,
                  }}>{loc.utilization}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: T.bgBase, borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)",
        padding: "16px 20px",
      }}>
        <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
          Recent Activity
        </span>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { user: "Rahul S.", action: "created dispatch", ref: "DSP-000042", time: "2h ago" },
            { user: "Priya K.", action: "received purchase", ref: "PUR-000018", time: "4h ago" },
            { user: "Admin", action: "recorded adjustment", ref: "ADJ-000003", time: "1d ago" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: T.accentTint,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: fonts.sans, fontSize: 11, fontWeight: 600, color: T.accent,
              }}>{a.user[0]}</div>
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: T.textBody }}>
                <strong>{a.user}</strong> {a.action}{" "}
                <span style={{ fontFamily: fonts.mono, fontSize: 12, fontWeight: 700, color: T.accent }}>{a.ref}</span>
              </span>
              <span style={{
                marginLeft: "auto", fontFamily: fonts.mono, fontSize: 11, color: T.textDim,
              }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────
function AdminDashboard() {
  const tenants = [
    { name: "Agri Fresh Foods", slug: "agri-fresh", plan: "Pro", status: "active", users: 8, modules: 12, created: "Jan 15, 2026" },
    { name: "Metro Warehousing", slug: "metro-wh", plan: "Starter", status: "trial", users: 3, modules: 6, created: "Mar 1, 2026" },
    { name: "Laxmi Traders", slug: "laxmi", plan: "Pro", status: "active", users: 5, modules: 10, created: "Feb 10, 2026" },
    { name: "Old Mill Co", slug: "old-mill", plan: "Starter", status: "suspended", users: 2, modules: 4, created: "Dec 5, 2025" },
  ];

  const accessRequests = [
    { email: "ankit@metro.com", name: "Ankit Sharma", date: "Mar 9, 2026", status: "pending" },
    { email: "pooja@agri.in", name: "Pooja Verma", date: "Mar 8, 2026", status: "pending" },
    { email: "raj@laxmi.com", name: "Raj Patel", date: "Mar 7, 2026", status: "pending" },
    { email: "demo@test.com", name: "Test User", date: "Mar 6, 2026", status: "pending" },
  ];

  return (
    <div>
      {/* Platform KPIs */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <KPICard label="Total Tenants" value="4" icon={Building2} change="+1" changeType="up" />
        <KPICard label="Total Users" value="18" icon={Users} change="+4" changeType="up" />
        <KPICard label="Active Tenants" value="2" icon={Activity} />
        <KPICard label="Pending Requests" value="4" icon={Clock} change="+2" changeType="down" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 24 }}>
        {/* Tenants Table */}
        <div style={{
          background: T.bgBase, borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
              Tenants
            </span>
            <button style={{
              height: 36, padding: "0 16px", borderRadius: 9999,
              background: T.accent, color: "#fff", border: "none",
              fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <Plus size={14} /> New Tenant
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 36, padding: "0 12px", borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.1)", background: T.bgBase,
            }}>
              <Search size={14} color={T.textDim} />
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: T.textDim }}>Search tenants...</span>
            </div>
          </div>

          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 70px 80px",
            padding: "10px 20px", borderBottom: "1px solid rgba(0,0,0,0.04)",
          }}>
            {["Tenant", "Plan", "Users", "Modules", "Status", ""].map(h => (
              <span key={h} style={{
                fontFamily: fonts.mono, fontSize: 10, fontWeight: 500,
                color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em",
              }}>{h}</span>
            ))}
          </div>

          {tenants.map((t, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 70px 80px",
              padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.03)",
              alignItems: "center", cursor: "pointer", transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bgOff}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div>
                <div style={{ fontFamily: fonts.sans, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{t.name}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: T.textDim }}>{t.slug}</div>
              </div>
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: T.textBody }}>{t.plan}</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: T.textBody }}>{t.users}</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: T.textBody }}>{t.modules}</span>
              <StatusBadge status={t.status} />
              <button style={{
                background: "none", border: `1px solid rgba(0,0,0,0.1)`,
                borderRadius: 6, padding: "4px 10px", fontFamily: fonts.sans,
                fontSize: 12, color: T.textMuted, cursor: "pointer",
              }}>
                <Eye size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                Manage
              </button>
            </div>
          ))}

          {/* Pagination */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 20px", borderTop: "1px solid rgba(0,0,0,0.04)",
          }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 12, color: T.textDim }}>
              Showing 1-4 of 4 tenants
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{
                width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)",
                background: T.bgBase, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}><ChevronLeft size={14} color={T.textDim} /></button>
              <button style={{
                width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)",
                background: T.bgBase, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}><ChevronRight size={14} color={T.textDim} /></button>
            </div>
          </div>
        </div>

        {/* Access Requests */}
        <div style={{
          background: T.bgBase, borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} color={T.accent} />
              <span style={{ fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                Pending Access Requests
              </span>
            </div>
            <span style={{
              background: T.orangeBg, color: T.accent, borderRadius: 9999,
              fontSize: 11, fontFamily: fonts.mono, padding: "2px 8px", fontWeight: 600,
            }}>{accessRequests.length}</span>
          </div>
          {accessRequests.map((r, i) => (
            <div key={i} style={{
              padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.03)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{
                    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
                    color: T.textPrimary,
                  }}>{r.name}</div>
                  <div style={{
                    fontFamily: fonts.mono, fontSize: 11, color: T.textDim, marginTop: 2,
                  }}>{r.email}</div>
                </div>
                <span style={{
                  fontFamily: fonts.mono, fontSize: 10, color: T.textDim,
                }}>{r.date}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={{
                  height: 30, padding: "0 14px", borderRadius: 9999,
                  background: T.accent, color: "#fff", border: "none",
                  fontFamily: fonts.sans, fontSize: 12, fontWeight: 500,
                  cursor: "pointer",
                }}>Approve</button>
                <button style={{
                  height: 30, padding: "0 14px", borderRadius: 9999,
                  background: "transparent", color: T.textMuted,
                  border: `1px solid rgba(0,0,0,0.12)`,
                  fontFamily: fonts.sans, fontSize: 12, fontWeight: 500,
                  cursor: "pointer",
                }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Search Dialog ───────────────────────────────────────
function SearchDialog({ onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "flex", justifyContent: "center", paddingTop: 120,
    }} onClick={onClose}>
      <div style={{
        width: 560, background: T.bgBase, borderRadius: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)", height: "fit-content",
        overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}>
          <Search size={18} color={T.textDim} />
          <span style={{
            fontFamily: fonts.sans, fontSize: 15, color: T.textDim, flex: 1,
          }}>Search dispatches, purchases, items...</span>
          <span style={{
            fontFamily: fonts.mono, fontSize: 10, color: T.textDim,
            background: T.bgOff, padding: "3px 8px", borderRadius: 4,
          }}>ESC</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{
            fontFamily: fonts.mono, fontSize: 10, color: T.textDim,
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "4px 8px", marginBottom: 8,
          }}>Recent</div>
          {[
            { type: "DISPATCH", id: "DSP-000042", desc: "Warehouse A → Godown B" },
            { type: "PURCHASE", id: "PUR-000018", desc: "Agri Traders → Warehouse A" },
            { type: "ITEM", id: "", desc: "Basmati Rice (1121)" },
          ].map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
              borderRadius: 8, cursor: "pointer", transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bgOff}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {r.id && <TypeBadge type={r.type} />}
              {!r.id && <Box size={14} color={T.textMuted} />}
              {r.id && <span style={{ fontFamily: fonts.mono, fontSize: 12, fontWeight: 700, color: T.accent }}>{r.id}</span>}
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: T.textBody }}>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────
export default function WareOSDashboardMockup() {
  const [view, setView] = useState("tenant");
  const [searchOpen, setSearchOpen] = useState(false);
  const isTenant = view === "tenant";

  return (
    <div style={{
      width: "100%", height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: fonts.sans, background: T.bgOff, overflow: "hidden",
    }}>
      {/* View Switcher (mockup control) */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, padding: "10px 0", background: T.bgInk,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: fonts.mono, fontSize: 11, marginRight: 8 }}>
          MOCKUP:
        </span>
        {["tenant", "admin"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            height: 32, padding: "0 16px", borderRadius: 9999,
            background: view === v ? T.accent : "rgba(255,255,255,0.08)",
            color: view === v ? "#fff" : "rgba(255,255,255,0.5)",
            border: "none", fontFamily: fonts.sans, fontSize: 12,
            fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
          }}>{v === "tenant" ? "Tenant Dashboard" : "Admin Dashboard"}</button>
        ))}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{
          width: T.sidebarW, background: T.bgBase, borderRight: "1px solid rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column", flexShrink: 0, overflow: "auto",
        }}>
          {/* Brand */}
          <div style={{
            padding: "18px 20px", display: "flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid rgba(0,0,0,0.05)",
          }}>
            <span style={{
              fontFamily: fonts.serif, fontSize: 18, fontWeight: 700, color: T.textPrimary,
              letterSpacing: "-0.3px",
            }}>
              Ware<span style={{ color: T.accent }}>OS</span>
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: T.accent, marginTop: -8,
            }} />
          </div>

          {/* Org name */}
          <div style={{
            padding: "12px 20px 8px", fontFamily: fonts.sans, fontSize: 11,
            color: T.textDim, textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {isTenant ? "Agri Fresh Foods" : "Platform Admin"}
          </div>

          {/* Dashboard link */}
          <div style={{
            display: "flex", alignItems: "center", padding: "8px 16px 8px 20px",
            gap: 10, cursor: "pointer", fontSize: 13.5, fontFamily: fonts.sans,
            color: T.accent, background: T.accentTint,
            borderLeft: `2px solid ${T.accent}`,
            marginBottom: 8,
          }}>
            <Home size={17} color={T.accent} />
            <span>Dashboard</span>
          </div>

          {/* Nav groups */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {isTenant ? (
              tenantNavGroups.map((g, i) => (
                <SidebarGroup key={i} group={g} defaultOpen={i === 0} />
              ))
            ) : (
              adminNavItems.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", padding: "8px 16px 8px 20px",
                  gap: 10, cursor: "pointer", fontSize: 13.5, fontFamily: fonts.sans,
                  color: item.active ? T.accent : T.textBody,
                  background: item.active ? T.accentTint : "transparent",
                  borderLeft: item.active ? `2px solid ${T.accent}` : "2px solid transparent",
                }}>
                  <item.icon size={17} color={item.active ? T.accent : T.textMuted} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: T.accent, color: "#fff", borderRadius: 9999,
                      fontSize: 10, fontFamily: fonts.mono, padding: "1px 7px", fontWeight: 600,
                    }}>{item.badge}</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* User */}
          <div style={{
            padding: "14px 20px", borderTop: "1px solid rgba(0,0,0,0.05)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: T.accentTint,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: fonts.sans, fontSize: 13, fontWeight: 600, color: T.accent,
            }}>N</div>
            <div>
              <div style={{ fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, color: T.textPrimary }}>Nirish</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: T.textDim }}>
                {isTenant ? "tenant_admin" : "super_admin"}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <header style={{
            height: T.headerH, padding: "0 28px", background: T.bgBase,
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <h1 style={{
              fontFamily: fonts.serif, fontSize: 20, fontWeight: 400,
              color: T.textPrimary, letterSpacing: "-0.3px", margin: 0,
            }}>
              {isTenant ? "Dashboard" : "Platform Overview"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Cmd+K Search */}
              {isTenant && (
                <button onClick={() => setSearchOpen(true)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  height: 36, padding: "0 14px", borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.1)", background: T.bgBase,
                  cursor: "pointer", color: T.textDim, fontFamily: fonts.sans, fontSize: 13,
                }}>
                  <Search size={14} />
                  <span>Search...</span>
                  <span style={{
                    fontFamily: fonts.mono, fontSize: 10, background: T.bgOff,
                    padding: "2px 6px", borderRadius: 4, marginLeft: 12,
                  }}>⌘K</span>
                </button>
              )}
              {/* Role badge */}
              <span style={{
                fontFamily: fonts.mono, fontSize: 11, padding: "4px 10px",
                borderRadius: 9999, background: T.accentTint, color: T.accent,
                fontWeight: 500,
              }}>
                {isTenant ? "tenant_admin" : "super_admin"}
              </span>
            </div>
          </header>

          {/* Page Content */}
          <main style={{
            flex: 1, overflow: "auto", padding: T.contentPx,
          }}>
            {isTenant ? <TenantDashboard /> : <AdminDashboard />}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav (shown as reference strip) */}
      {isTenant && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, padding: "8px 0", background: T.bgInk,
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: fonts.mono, fontSize: 10, marginRight: 8 }}>
            MOBILE BOTTOM NAV →
          </span>
          {[
            { icon: Home, label: "Home" },
            { icon: Package, label: "Receive" },
            { icon: Truck, label: "Dispatch" },
            { icon: Layers, label: "Stock" },
            { icon: Menu, label: "More" },
          ].map((tab, i) => (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "4px 14px", cursor: "pointer",
            }}>
              <tab.icon size={18} color={i === 0 ? T.accent : "rgba(255,255,255,0.4)"} />
              <span style={{
                fontFamily: fonts.sans, fontSize: 9, fontWeight: 500,
                color: i === 0 ? T.accent : "rgba(255,255,255,0.4)",
              }}>{tab.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search Dialog */}
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </div>
  );
}