-- Waitlist table for early access signups
CREATE TABLE IF NOT EXISTS public.waitlist (
    id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email      text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_waitlist" ON public.waitlist
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "authenticated_read_waitlist" ON public.waitlist
    FOR SELECT TO authenticated USING (true);
