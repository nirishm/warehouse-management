'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useScrollReveal } from './use-scroll-reveal';
import s from './landing.module.css';

const navItems = [
  { label: 'Modules', href: '#modules' },
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const ref = useScrollReveal<HTMLElement>();

  // Nav active highlighting via IntersectionObserver
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.getAttribute('id') || '');
          }
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className={s.nav} ref={ref}>
        <div className={s.navInner}>
          <a href="#" className={s.navLogo}>
            <span className={s.navLogoMark} />
            WareOS
          </a>
          <ul className={s.navLinks}>
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={s.navLink}
                  style={activeId === item.href.slice(1) ? { color: 'var(--text-primary)' } : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className={s.navActions}>
            <div className={s.navActionsDesktop}>
              <Link href="/login" className={s.btnLogin}>
                Log in
              </Link>
              <a href="#waitlist" className={s.btnOrange}>
                Request Early Access
              </a>
            </div>
            <button
              className={`${s.hamburger} ${menuOpen ? s.hamburgerOpen : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className={s.hamburgerLine} />
              <span className={s.hamburgerLine} />
              <span className={s.hamburgerLine} />
            </button>
          </div>
        </div>
      </header>
      {/* Mobile menu overlay */}
      <div className={`${s.mobileMenu} ${menuOpen ? s.mobileMenuOpen : ''}`}>
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={s.mobileMenuLink}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </a>
        ))}
        <Link href="/login" className={s.mobileMenuLink} onClick={() => setMenuOpen(false)}>
          Log in
        </Link>
        <a
          href="#waitlist"
          className={s.btnOrange}
          onClick={() => setMenuOpen(false)}
        >
          Get Early Access
        </a>
      </div>
    </>
  );
}
