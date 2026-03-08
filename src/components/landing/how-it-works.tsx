'use client';

import s from './landing.module.css';
import { useScrollReveal } from './use-scroll-reveal';

const steps = [
  {
    num: '01',
    label: '01 — Onboard',
    title: 'Create your tenant workspace',
    desc: "Get invited, name your workspace, and add your team. WareOS provisions a dedicated schema with isolated data — your data never touches another tenant's.",
  },
  {
    num: '02',
    label: '02 — Configure',
    title: 'Enable modules and import stock',
    desc: 'Turn on only the modules you need. Import existing SKUs via CSV or build your catalogue from scratch with custom field definitions per entity type.',
  },
  {
    num: '03',
    label: '03 — Operate',
    title: 'Move inventory with confidence',
    desc: 'Process dispatches, receipts, and sales — every action is logged, numbered, and auditable. Your warehouse runs on facts, not memory.',
  },
];

export function HowItWorks() {
  const ref = useScrollReveal<HTMLElement>();
  return (
    <section className={s.how} id="how" ref={ref}>
      <div className={s.container}>
        <div className={`${s.howHeader} reveal`}>
          <div className={s.sectionLabel}>Process</div>
          <h2 className={s.sectionHeadline} style={{ marginTop: 12 }}>
            Up and running in three steps.
          </h2>
        </div>
        <div className={s.howSteps}>
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`${s.howStep} reveal`}
              style={{ '--reveal-delay': `${i * 0.12}s` } as React.CSSProperties}
            >
              <div className={s.howStepBgNum}>{step.num}</div>
              <div className={s.howStepNum}>{step.label}</div>
              <h3 className={s.howStepTitle}>{step.title}</h3>
              <p className={s.howStepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
