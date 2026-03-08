import type { Metadata } from 'next';
import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { DashboardMock } from '@/components/landing/dashboard-mock';
import { ModuleShowcase } from '@/components/landing/module-showcase';
import { HowItWorks } from '@/components/landing/how-it-works';
import { FeatureDeepDive } from '@/components/landing/feature-deep-dive';
import { CtaBanner } from '@/components/landing/cta-banner';
import { Footer } from '@/components/landing/footer';
import s from '@/components/landing/landing.module.css';

export const metadata: Metadata = {
  title: 'WareOS — Warehouse Intelligence for Modern Operations',
  description:
    'A unified platform for inventory, dispatch, purchasing, and sales across your entire warehouse. Join the early preview.',
  openGraph: {
    title: 'WareOS — Warehouse Intelligence for Modern Operations',
    description:
      'A unified platform for inventory, dispatch, purchasing, and sales across your entire warehouse.',
    siteName: 'WareOS',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <div className={s.landing}>
      <Nav />
      <Hero />
      <DashboardMock />
      <ModuleShowcase />
      <HowItWorks />
      <FeatureDeepDive />
      <CtaBanner />
      <Footer />
    </div>
  );
}
