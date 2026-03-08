'use client';

import s from './landing.module.css';
import { useScrollReveal } from './use-scroll-reveal';

const modules = [
  { num: '01', name: 'Inventory', desc: 'Real-time stock tracking, multi-location support, and customizable field definitions.' },
  { num: '02', name: 'Dispatch', desc: 'Sequential order numbering, bulk dispatch operations, and full status tracking.' },
  { num: '03', name: 'Purchasing', desc: 'PO management, supplier tracking, and automated receipt workflows.' },
  { num: '04', name: 'Sales', desc: 'Sales order creation, invoice generation, and customer history in one view.' },
  { num: '05', name: 'Analytics', desc: 'Cross-module reporting, trend analysis, and exportable dashboards.' },
  { num: '06', name: 'Shortage Alerts', desc: 'Predictive reorder triggers, threshold rules, and notification routing.' },
  { num: '07', name: 'User Management', desc: 'Role-based access, per-tenant permissions, and SSO-ready auth flows.' },
  { num: '08', name: 'Audit Log', desc: 'Immutable change history for every mutation across every module.' },
];

export function ModuleShowcase() {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section className={s.modules} id="modules" ref={ref}>
      <div className={s.container}>
        <div className={`${s.modulesHeader} reveal`}>
          <div className={s.sectionLabel}>8 Integrated Modules</div>
          <h2 className={s.sectionHeadline} style={{ marginTop: 12 }}>
            Eight modules, built to work together.
          </h2>
        </div>
        <div className={s.modulesGrid}>
          {modules.map((m, i) => (
            <div
              key={m.num}
              className={`${s.moduleCard} reveal`}
              style={{ '--reveal-delay': `${i * 0.05}s` } as React.CSSProperties}
            >
              <span className={s.moduleCardNum}>{m.num}</span>
              <div className={s.moduleCardName}>{m.name}</div>
              <p className={s.moduleCardDesc}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
