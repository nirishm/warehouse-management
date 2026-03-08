'use client';

import { useState, useTransition } from 'react';
import { joinWaitlist } from '@/app/actions/waitlist';
import { useScrollReveal } from './use-scroll-reveal';
import s from './landing.module.css';

export function CtaBanner() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useScrollReveal<HTMLElement>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await joinWaitlist(trimmed);
      setNote(result.message);
      setNoteSuccess(result.success);
      if (result.success) {
        setEmail('');
        setSubmitted(true);
      }
    });
  }

  return (
    <section className={s.ctaBanner} id="waitlist" ref={ref}>
      <div className={s.container}>
        <div className="reveal">
          <p className={s.ctaBannerEyebrow}>Limited Early Access</p>
          <h2 className={s.ctaBannerHeadline}>We&apos;re letting in a small group first.</h2>
          <form className={s.ctaForm} onSubmit={handleSubmit}>
            <input
              type="email"
              className={s.ctaFormInput}
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitted}
            />
            <button
              type="submit"
              className={s.btnWhite}
              disabled={isPending || submitted}
            >
              {isPending ? 'Joining\u2026' : submitted ? "You're in \u2713" : 'Join the Preview \u2192'}
            </button>
          </form>
          <p className={noteSuccess ? s.ctaFormNoteSuccess : s.ctaFormNote}>{note}</p>
        </div>
      </div>
    </section>
  );
}
