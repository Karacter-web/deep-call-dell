CREATE TABLE public.voice_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  language text NOT NULL DEFAULT 'en',
  gender text NOT NULL DEFAULT 'neutral',
  style text NOT NULL DEFAULT 'conversational',
  provider text NOT NULL DEFAULT 'elevenlabs',
  provider_voice_id text,
  sample_path text,
  stability numeric NOT NULL DEFAULT 0.5,
  similarity numeric NOT NULL DEFAULT 0.75,
  speed numeric NOT NULL DEFAULT 1.0,
  pitch numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ready',
  is_preset boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_models TO authenticated;
GRANT SELECT ON public.voice_models TO anon;
GRANT ALL ON public.voice_models TO service_role;

ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preset voices" ON public.voice_models
  FOR SELECT USING (is_preset = true);
CREATE POLICY "Users view their own voices" ON public.voice_models
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own voices" ON public.voice_models
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND is_preset = false);
CREATE POLICY "Users update their own voices" ON public.voice_models
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND is_preset = false) WITH CHECK (auth.uid() = user_id AND is_preset = false);
CREATE POLICY "Users delete their own voices" ON public.voice_models
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND is_preset = false);

CREATE TRIGGER update_voice_models_updated_at BEFORE UPDATE ON public.voice_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.voice_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_model_id uuid NOT NULL REFERENCES public.voice_models(id) ON DELETE CASCADE,
  label text,
  file_path text NOT NULL,
  duration_seconds numeric,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_samples TO authenticated;
GRANT ALL ON public.voice_samples TO service_role;

ALTER TABLE public.voice_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own samples" ON public.voice_samples
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_voice_samples_model ON public.voice_samples(voice_model_id);
CREATE INDEX idx_voice_models_user ON public.voice_models(user_id);

INSERT INTO public.voice_models (name, description, language, gender, style, provider, provider_voice_id, is_preset, stability, similarity, speed)
VALUES
  ('Aria', 'Warm, clear female voice tuned for customer support calls.', 'en', 'female', 'conversational', 'elevenlabs', '9BWtsMINqrJLrRacOk9x', true, 0.5, 0.75, 1.0),
  ('George', 'Calm British male narrator, great for formal calls.', 'en', 'male', 'professional', 'elevenlabs', 'JBFqnCBsd6RMkjVDRZzb', true, 0.55, 0.8, 1.0),
  ('Sarah', 'Bright, energetic female voice for sales conversations.', 'en', 'female', 'energetic', 'elevenlabs', 'EXAVITQu4vr4xnSDxMaL', true, 0.45, 0.7, 1.05),
  ('Amara', 'Nigerian-accented female voice, natural for Yoruba and English.', 'yo', 'female', 'conversational', 'elevenlabs', 'XB0fDUnXU5powFXDhCwa', true, 0.5, 0.8, 1.0),
  ('Diego', 'Neutral Latin American Spanish male voice.', 'es', 'male', 'conversational', 'elevenlabs', 'onwK4e9ZLuTAKqWW03F9', true, 0.5, 0.75, 1.0),
  ('Chloé', 'Soft French female voice for European calls.', 'fr', 'female', 'calm', 'elevenlabs', 'pFZP5JQG7iQjIQuC4Bku', true, 0.55, 0.75, 0.98);