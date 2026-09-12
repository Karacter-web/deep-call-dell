import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { previewVoice } from "@/lib/voice.functions";

export type PreviewVoiceInput = {
  language: string;
  gender: string;
  style: string;
  providerVoiceId?: string | null;
  description?: string | null;
  stability: number;
  similarity: number;
  speed: number;
  pitch: number;
};

/** Plays a short, lifelike sample of a voice so it can be tested before use. */
export function VoicePreviewButton({
  voice,
  text,
  label = "Preview",
  size = "sm",
  variant = "outline",
}: {
  voice: PreviewVoiceInput;
  text?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
}) {
  const generate = useServerFn(previewVoice);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const play = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    setLoading(true);
    try {
      const result = await generate({ data: { ...voice, text } });
      const audio = new Audio(`data:audio/mpeg;base64,${result.audio}`);
      audioRef.current?.pause();
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onpause = () => setPlaying(false);
      await audio.play();
      setPlaying(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not play this voice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" size={size} variant={variant} disabled={loading} onClick={() => void play()}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {loading ? "Loading…" : playing ? "Stop" : label}
    </Button>
  );
}
