'use client';

import s from './landing.module.css';
import { useScrollReveal } from './use-scroll-reveal';

export function DashboardMock() {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section className={s.dashboardSection} id="platform" ref={ref}>
      <div className={s.container}>
        <div className={`${s.dashboardHeader} reveal`}>
          <div>
            <div className={s.sectionLabel}>The Platform</div>
            <h2 className={s.sectionHeadline}>A single screen for your entire operation.</h2>
          </div>
          <p className={s.sectionBody}>
            Here&apos;s what WareOS looks like inside — real-time stock levels, order pipelines, and dispatch queues in a single purpose-built interface.
          </p>
        </div>
        <div className={`${s.dashboardMock} reveal`} style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
          {/* Browser chrome */}
          <div className={s.mockTopbar}>
            <div className={s.mockDotRed} />
            <div className={s.mockDotYellow} />
            <div className={s.mockDotGreen} />
            <div className={s.mockUrl}>
              <span className={s.mockUrlText}>wareos.in / t / hartfield / inventory</span>
            </div>
          </div>
          <div className={s.mockBody}>
            {/* Sidebar */}
            <div className={s.mockSidebar}>
              <div className={s.mockSidebarLogo}>
                <div className={s.mockSidebarLogoMark} />
                WareOS
              </div>
              <div className={s.mockNavSection}>Operations</div>
              <div className={s.mockNavItemActive}>
                <div className={s.mockNavIcon} /> Inventory
              </div>
              <div className={s.mockNavItem}>
                <div className={s.mockNavIcon} /> Dispatch
              </div>
              <div className={s.mockNavItem}>
                <div className={s.mockNavIcon} /> Purchases
              </div>
              <div className={s.mockNavItem}>
                <div className={s.mockNavIcon} /> Sales
              </div>
              <div className={s.mockNavSection}>Insights</div>
              <div className={s.mockNavItem}>
                <div className={s.mockNavIcon} /> Analytics
              </div>
              <div className={s.mockNavItem}>
                <div className={s.mockNavIcon} /> Shortages
              </div>
              <div className={s.mockNavSection}>Admin</div>
              <div className={s.mockNavItem}>
                <div className={s.mockNavIcon} /> Users
              </div>
              <div className={s.mockNavItem}>
                <div className={s.mockNavIcon} /> Audit Log
              </div>
            </div>
            {/* Main content */}
            <div className={s.mockMain}>
              <div className={s.mockPageHeader}>
                <div className={s.mockPageTitle}>Inventory</div>
                <div className={s.mockBtnSm}>+ Add Item</div>
              </div>
              <div className={s.mockStatsRow}>
                <div className={s.mockStatCard}>
                  <div className={s.mockStatLabel}>Total SKUs</div>
                  <div className={s.mockStatValue}>1,284</div>
                  <div className={s.mockStatDelta}>+12 this week</div>
                </div>
                <div className={s.mockStatCard}>
                  <div className={s.mockStatLabel}>In Stock</div>
                  <div className={s.mockStatValue}>98.2%</div>
                  <div className={s.mockStatDelta}>+0.4%</div>
                </div>
                <div className={s.mockStatCard}>
                  <div className={s.mockStatLabel}>Low Stock</div>
                  <div className={s.mockStatValue} style={{ color: 'var(--accent-color)' }}>23</div>
                  <div className={s.mockStatDelta} style={{ color: 'var(--red)' }}>needs review</div>
                </div>
                <div className={s.mockStatCard}>
                  <div className={s.mockStatLabel}>Movements</div>
                  <div className={s.mockStatValue}>347</div>
                  <div className={s.mockStatDelta}>today</div>
                </div>
              </div>
              <div className={s.mockTable}>
                <div className={s.mockTableHead}>
                  <span className={s.mockTh}>Item</span>
                  <span className={s.mockTh}>SKU</span>
                  <span className={s.mockTh}>Qty</span>
                  <span className={s.mockTh}>Location</span>
                  <span className={s.mockTh}>Status</span>
                </div>
                <div className={s.mockTableRow}>
                  <span className={s.mockTdName}>Industrial Valve A4</span>
                  <span className={s.mockTdMono}>IVA-0042</span>
                  <span className={s.mockTd}>240</span>
                  <span className={s.mockTdMono}>B-03-12</span>
                  <span className={s.mockBadgeGreen}>In Stock</span>
                </div>
                <div className={s.mockTableRow}>
                  <span className={s.mockTdName}>Bearing Housing 22mm</span>
                  <span className={s.mockTdMono}>BH-0018</span>
                  <span className={s.mockTd}>12</span>
                  <span className={s.mockTdMono}>A-01-05</span>
                  <span className={s.mockBadgeOrange}>Low Stock</span>
                </div>
                <div className={s.mockTableRow}>
                  <span className={s.mockTdName}>Hex Bolt M10&times;50</span>
                  <span className={s.mockTdMono}>HBM-1050</span>
                  <span className={s.mockTd}>4,800</span>
                  <span className={s.mockTdMono}>C-07-01</span>
                  <span className={s.mockBadgeGreen}>In Stock</span>
                </div>
                <div className={s.mockTableRow}>
                  <span className={s.mockTdName}>Control Board CB-9</span>
                  <span className={s.mockTdMono}>CB-0009</span>
                  <span className={s.mockTd}>0</span>
                  <span className={s.mockTdMono}>&mdash;</span>
                  <span className={s.mockBadgeGray}>Out of Stock</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
