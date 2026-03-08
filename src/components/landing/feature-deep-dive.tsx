'use client';

import s from './landing.module.css';
import { useScrollReveal } from './use-scroll-reveal';

export function FeatureDeepDive() {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section className={s.features} id="features" ref={ref}>
      <div className={s.container}>
        <div className={`${s.featuresHeader} reveal`}>
          <div className={s.sectionLabel}>Features</div>
          <h2 className={s.sectionHeadline} style={{ marginTop: 12 }}>
            The details that make the difference.
          </h2>
        </div>

        {/* Row 1: Multi-Tenancy */}
        <div className={s.featureRowFirst}>
          <div className={`${s.featureRowCopy} reveal`}>
            <div className={`${s.featureRowTag} ${s.tag}`}>Multi-Tenancy</div>
            <h3 className={s.featureRowTitle}>Strict tenant isolation, out of the box.</h3>
            <p className={s.featureRowBody}>
              Every tenant gets a dedicated Postgres schema. No shared tables. No cross-contamination.
              Your team&apos;s data belongs only to your team — enforced at the database level, not just
              the application layer.
            </p>
            <ul className={s.featureRowPoints}>
              {[
                'Schema-per-tenant architecture on Supabase',
                'Tenant context resolved via URL slug',
                'Service role isolation with row-level policies',
                'Zero-downtime tenant provisioning',
              ].map((point) => (
                <li key={point} className={s.featureRowPoint}>
                  <span className={s.featureRowPointArrow}>&rarr;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className={`${s.featureRowVisual} reveal`} style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
            <div className={s.featureVisual}>
              <div>
                <div className={s.fvLabel}>Active Tenant Schemas</div>
                <div className={s.fvNumber}>
                  <span className={s.fvAccent}>3</span> active
                </div>
              </div>
              <div className={s.fvList}>
                <div className={s.fvListItem}>
                  <div className={s.fvListDot} />
                  <span className={s.fvMonoText}>tenant_hartfield</span>
                </div>
                <div className={s.fvListItem}>
                  <div className={s.fvListDotGreen} />
                  <span className={s.fvMonoText}>tenant_meridian</span>
                </div>
                <div className={s.fvListItem}>
                  <div className={s.fvListDotGray} />
                  <span className={s.fvMonoText}>tenant_atlas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Audit & Compliance (reversed) */}
        <div className={`${s.featureRow} ${s.featureRowReverse}`}>
          <div className={`${s.featureRowCopy} reveal`}>
            <div className={`${s.featureRowTag} ${s.tag}`}>Audit &amp; Compliance</div>
            <h3 className={s.featureRowTitle}>An immutable record of everything that happens.</h3>
            <p className={s.featureRowBody}>
              Every mutation — every stock movement, dispatch, sale, and config change — writes to an
              append-only audit log. Perfect for compliance, dispute resolution, and peace of mind.
            </p>
            <ul className={s.featureRowPoints}>
              {[
                'Automatic audit entries on all mutations',
                'Who, what, when — fully queryable history',
                'Exportable for compliance reporting',
                'Per-module audit trail isolation',
              ].map((point) => (
                <li key={point} className={s.featureRowPoint}>
                  <span className={s.featureRowPointArrow}>&rarr;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className={`${s.featureRowVisual} reveal`} style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
            <div className={s.featureVisual}>
              <div>
                <div className={s.fvLabel}>Recent Audit Events</div>
              </div>
              <div className={s.fvList}>
                <div className={s.fvListItemCol}>
                  <div className={s.fvEventCode}>DSP-000143 &middot; DISPATCHED</div>
                  <div className={s.fvEventMeta}>j.harwood@hartfield.com &middot; 2min ago</div>
                </div>
                <div className={s.fvListItemCol}>
                  <div className={s.fvEventCode}>IVA-0042 &middot; QTY UPDATED</div>
                  <div className={s.fvEventMeta}>system &middot; 8min ago</div>
                </div>
                <div className={s.fvListItemCol}>
                  <div className={s.fvEventCodeDim}>PUR-000088 &middot; RECEIVED</div>
                  <div className={s.fvEventMeta}>k.osei@hartfield.com &middot; 1hr ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Custom Fields */}
        <div className={s.featureRow}>
          <div className={`${s.featureRowCopy} reveal`}>
            <div className={`${s.featureRowTag} ${s.tag}`}>Custom Fields</div>
            <h3 className={s.featureRowTitle}>Mould the system to your operation.</h3>
            <p className={s.featureRowBody}>
              Every warehouse is different. WareOS lets you define custom fields on any entity —
              products, dispatches, purchases — validated against schema definitions you control at the
              API boundary.
            </p>
            <ul className={s.featureRowPoints}>
              {[
                'JSONB custom fields with type validation',
                'Per-tenant field definitions stored in DB',
                'API-level Zod schema enforcement',
                'Custom fields appear in exports and reports',
              ].map((point) => (
                <li key={point} className={s.featureRowPoint}>
                  <span className={s.featureRowPointArrow}>&rarr;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className={`${s.featureRowVisual} reveal`} style={{ '--reveal-delay': '0.15s' } as React.CSSProperties}>
            <div className={s.featureVisual}>
              <div>
                <div className={s.fvLabel}>Custom Fields — Inventory</div>
              </div>
              <div className={s.fvGrid}>
                {[
                  { type: 'text', label: 'Supplier Code' },
                  { type: 'num', label: 'Weight (kg)' },
                  { type: 'bool', label: 'Hazardous' },
                  { type: 'date', label: 'Expiry' },
                  { type: 'enum', label: 'Category' },
                ].map((field) => (
                  <div key={field.label} className={s.fvGridCell}>
                    <div className={s.fvGridVal}>{field.type}</div>
                    <div className={s.fvGridLbl}>{field.label}</div>
                  </div>
                ))}
                <div className={s.fvGridCellAdd}>
                  <div className={s.fvGridValAdd}>+</div>
                  <div className={s.fvGridLblAccent}>Add field</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
