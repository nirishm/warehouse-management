'use client';

import { useScrollReveal } from './use-scroll-reveal';
import s from './landing.module.css';

export function Hero() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section className={s.hero} ref={ref}>
      <div className={s.heroBlob} />
      <div className={s.container}>
        <div className={s.heroContent}>
          <div className={s.heroPreviewPill}>EARLY PREVIEW</div>
          <div className={`${s.heroEyebrow} reveal`}>
            <div className={s.heroEyebrowLine} />
            <span className={s.tag}>Launching Q2 2026</span>
          </div>
          <h1 className={`${s.heroHeadline} reveal`}>
            Every item.<br />
            Every movement.<br />
            <em className={s.heroHeadlineAccent}>Total clarity.</em>
          </h1>
          <p className={`${s.heroBody} reveal`}>
            We&apos;re building WareOS — a unified platform for inventory, dispatch, purchasing, and
            sales across your entire warehouse. We&apos;re onboarding a small group of early users to
            shape the product.
          </p>
          <div className={`${s.heroCtas} reveal`}>
            <a href="#waitlist" className={s.btnOrange}>
              Request Early Access &rarr;
            </a>
            <a href="#how" className={s.btnGhost}>
              See what we&apos;re building
            </a>
          </div>
        </div>
      </div>
      <div className={s.heroScroll}>
        <span>Scroll</span>
        <div className={s.heroScrollLine} />
      </div>
    </section>
  );
}
