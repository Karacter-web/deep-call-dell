import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallStudio } from "@/context/CallStudioContext";

/**
 * Captures microphone input for local monitoring / mic-side dictation.
 * In the Twilio deployment, the caller audio arrives on the backend via
 * Media Streams — this panel monitors the operator side and reports levels.
 */
export function AudioInput() {
  const { inputLevel, setInputLevel, callStatus, callerNumber } = useCallStudio();
  const [micOn, setMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const stopMic = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setMicOn(false);
    setInputLevel(0);
  };

  const startMic = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (const v of buffer) sum += (v - 128) ** 2;
        setInputLevel(Math.min(1, Math.sqrt(sum / buffer.length) / 40));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        source.disconnect();
        void ctx.close();
      };
      setMicOn(true);
    } catch {
      setError("Microphone access was denied.");
    }
  };

  const bars = Array.from({ length: 28 });

  return (
    <section className="panel-surface rounded-2xl px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={
              callStatus === "active"
                ? "h-2.5 w-2.5 rounded-full bg-live animate-pulse-live"
                : "h-2.5 w-2.5 rounded-full bg-muted-foreground/50"
            }
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold">
              {callStatus === "active"
                ? "Call in progress"
                : callStatus === "connecting"
                  ? "Connecting…"
                  : callStatus === "ended"
                    ? "Call ended"
                    : "Standby"}
            </p>
            <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <PhoneCall className="h-3.5 w-3.5" aria-hidden />
              {callerNumber ?? "no caller connected"}
            </p>
          </div>
        </div>

        <div
          className="flex h-10 flex-1 items-end justify-center gap-[3px]"
          role="img"
          aria-label={`Input level ${Math.round(inputLevel * 100)} percent`}
        >
          {bars.map((_, i) => {
            const spread = 1 - Math.abs(i - bars.length / 2) / (bars.length / 2);
            const h = Math.max(3, inputLevel * 40 * (0.35 + spread));
            return (
              <span
                key={i}
                className="w-[3px] rounded-full bg-primary/70 transition-all duration-100"
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        <Button
          type="button"
          variant={micOn ? "secondary" : "outline"}
          onClick={() => (micOn ? stopMic() : void startMic())}
        >
          {micOn ? (
            <>
              <MicOff className="h-4 w-4" /> Stop mic
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" /> Monitor mic
            </>
          )}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
