CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "Users see their own calls" ON public.call_sessions;
CREATE POLICY "Users see their own calls" ON public.call_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users see their own transcripts" ON public.call_transcripts;
CREATE POLICY "Users see their own transcripts" ON public.call_transcripts FOR ALL TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users manage their own numbers" ON public.phone_numbers;
CREATE POLICY "Users manage their own numbers" ON public.phone_numbers FOR ALL TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "Users view their own messages" ON public.sms_messages;
CREATE POLICY "Users view their own messages" ON public.sms_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

DROP FUNCTION public.has_role(uuid, public.app_role);