-- ============================================================
-- GymTracker App – Esquema Supabase (v3)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Compatible con el esquema v2 de la PWA (mismas tablas), añade
-- índices por updated_at para el pull incremental del sync.
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text        NOT NULL DEFAULT '',
  email        text        NOT NULL DEFAULT '',
  profile_data jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Colecciones sincronizadas (una fila por entidad y usuario) ──
CREATE TABLE IF NOT EXISTS public.exercises (
  id         text        NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.routines (
  id         text        NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id         text        NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.body_weight_entries (
  id         text        NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.measurements (
  id         text        NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self"     ON public.profiles;
DROP POLICY IF EXISTS "exercises_owner"   ON public.exercises;
DROP POLICY IF EXISTS "routines_owner"    ON public.routines;
DROP POLICY IF EXISTS "sessions_owner"    ON public.sessions;
DROP POLICY IF EXISTS "body_weight_owner" ON public.body_weight_entries;
DROP POLICY IF EXISTS "measurements_owner" ON public.measurements;

CREATE POLICY "profiles_self"       ON public.profiles            FOR ALL USING (auth.uid() = id)      WITH CHECK (auth.uid() = id);
CREATE POLICY "exercises_owner"     ON public.exercises           FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "routines_owner"      ON public.routines            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_owner"      ON public.sessions            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "body_weight_owner"   ON public.body_weight_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "measurements_owner"  ON public.measurements        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Perfil automático al registrarse ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Índices para el pull incremental (user_id + updated_at) ──
CREATE INDEX IF NOT EXISTS idx_exercises_user_updated    ON public.exercises           (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_routines_user_updated     ON public.routines            (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated     ON public.sessions            (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_bw_user_updated           ON public.body_weight_entries (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_measurements_user_updated ON public.measurements        (user_id, updated_at);
