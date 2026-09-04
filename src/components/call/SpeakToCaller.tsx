import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, PhoneOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCallStudio } from "@/context/CallStudioContext";
import { speakToCall, hangUpCall } from "@/lib/telephony.functions";

/** Lets the agent speak (optionally translated) into the live phone call. */
export function SpeakToCaller() {
  const { liveSessionId, isLiveCall, translationEnabled, targetLang } = useCallStudio();
  const speak = useServerFn(speakToCall);
  const hangUp = useServerFn(hangUpCall);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!liveSessionId) return null;

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await speak({
        data: { sessionId: liveSessionId, text: text.trim(), translate: translationEnabled },
      });
      setText("");
      toast.success("Spoken to the caller");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reach the call");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="panel-surface rounded-2xl px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="speak-text" className="text-xs text-muted-foreground">
            Reply to the caller {translationEnabled ? `(spoken in ${targetLang})` : ""}
          </label>
          <Textarea
            id="speak-text"
            rows={2}
            value={text}
            placeholder="Type what should be said out loud on the call…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            className="mt-1.5"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void send()} disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Speak
          </Button>
          {isLiveCall ? (
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                try {
                  await hangUp({ data: { sessionId: liveSessionId } });
                  toast.success("Call ended");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not end the call");
                }
              }}
            >
              <PhoneOff className="h-4 w-4" /> Hang up
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
