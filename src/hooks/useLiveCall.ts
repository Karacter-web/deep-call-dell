import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CallStatus, TranscriptLine } from "@/context/CallStudioContext";

type LiveHandlers = {
  onCallStatus: (status: CallStatus, caller?: string | null) => void;
  onIncoming: (line: TranscriptLine) => void;
  onTranslated: (line: TranscriptLine) => void;
};

type TranscriptRow = {
  id: string;
  session_id: string;
  speaker: string;
  text: string;
  translated_text: string | null;
  is_final: boolean;
  sequence: number;
  created_at: string;
};

type SessionRow = {
  id: string;
  call_sid: string;
  from_number: string | null;
  status: string;
  started_at: string;
};

const ACTIVE = ["connecting", "active", "ringing", "in-progress"];

function toStatus(status: string): CallStatus {
  if (status === "connecting" || status === "ringing") return "connecting";
  if (status === "active" || status === "in-progress") return "active";
  return "ended";
}

/**
 * Subscribes to real Twilio-driven calls: watches the signed-in user's live
 * call session and streams its transcript/translation rows into the studio.
 */
export function useLiveCall(handlers: LiveHandlers) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const cb = useRef(handlers);
  cb.current = handlers;
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const pushTranscript = (row: TranscriptRow) => {
      const line: TranscriptLine = {
        id: row.id,
        speaker: row.speaker === "agent" ? "agent" : "caller",
        text: row.text,
        at: new Date(row.created_at).getTime(),
        partial: !row.is_final,
      };
      cb.current.onIncoming(line);
      if (row.translated_text) {
        cb.current.onTranslated({ ...line, text: row.translated_text });
      }
    };

    const adoptSession = async (session: SessionRow) => {
      sessionRef.current = session.id;
      setSessionId(session.id);
      const live = ACTIVE.includes(session.status);
      setIsLive(live);
      cb.current.onCallStatus(toStatus(session.status), session.from_number);

      const { data: rows } = await supabase
        .from("call_transcripts")
        .select("*")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      (rows as TranscriptRow[] | null)?.forEach(pushTranscript);
    };

    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("call_sessions")
        .select("id, call_sid, from_number, status, started_at")
        .order("started_at", { ascending: false })
        .limit(1);
      const latest = (data as SessionRow[] | null)?.[0];
      if (latest && ACTIVE.includes(latest.status) && !cancelled) {
        await adoptSession(latest);
      }

      const channel = supabase
        .channel("live-calls")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "call_sessions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as SessionRow | null;
            if (!row) return;
            if (ACTIVE.includes(row.status)) {
              if (sessionRef.current !== row.id) void adoptSession(row);
              else cb.current.onCallStatus(toStatus(row.status), row.from_number);
            } else if (sessionRef.current === row.id) {
              setIsLive(false);
              cb.current.onCallStatus("ended", row.from_number);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_transcripts",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as TranscriptRow;
            if (sessionRef.current && row.session_id !== sessionRef.current) return;
            pushTranscript(row);
          },
        )
        .subscribe();

      return channel;
    };

    const channelPromise = init();

    return () => {
      cancelled = true;
      void channelPromise.then((channel) => {
        if (channel) void supabase.removeChannel(channel);
      });
    };
  }, []);

  return { sessionId, isLive };
}
