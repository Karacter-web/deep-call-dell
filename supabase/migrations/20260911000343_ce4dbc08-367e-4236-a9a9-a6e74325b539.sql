ALTER TABLE public.call_sessions
  ADD COLUMN duration_seconds integer,
  ADD COLUMN provider_error text;

CREATE UNIQUE INDEX phone_numbers_twilio_sid_key ON public.phone_numbers (twilio_sid) WHERE twilio_sid IS NOT NULL;

CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number_id uuid REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  message_sid text,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  error_code text,
  error_message text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own messages"
ON public.sms_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own messages"
ON public.sms_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own messages"
ON public.sms_messages FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own messages"
ON public.sms_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE UNIQUE INDEX sms_messages_message_sid_key ON public.sms_messages (message_sid) WHERE message_sid IS NOT NULL;
CREATE INDEX sms_messages_user_created_idx ON public.sms_messages (user_id, created_at DESC);
CREATE INDEX sms_messages_phone_created_idx ON public.sms_messages (phone_number_id, created_at DESC);
CREATE INDEX call_sessions_user_started_idx ON public.call_sessions (user_id, started_at DESC);
CREATE INDEX call_transcripts_session_created_idx ON public.call_transcripts (session_id, created_at);

CREATE TRIGGER update_sms_messages_updated_at
BEFORE UPDATE ON public.sms_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();