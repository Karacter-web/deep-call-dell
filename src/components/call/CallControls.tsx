import { Languages, PhoneOff, SlidersHorizontal, ArrowLeftRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { hangUpCall } from "@/lib/telephony.functions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallStudio, LANGUAGES } from "@/context/CallStudioContext";

export function CallControls() {
  const {
    callStatus,
    liveSessionId,
    endCall,
    translationEnabled,
    toggleTranslation,
    soundTuningEnabled,
    toggleSoundTuning,
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
  } = useCallStudio();

  const hangUp = useServerFn(hangUpCall);
  const hangUpMutation = useMutation({
    mutationFn: (sessionId: string) => hangUp({ data: { sessionId } }),
    onSuccess: () => {
      endCall();
      toast.success("Call ended");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const live = callStatus === "active" || callStatus === "connecting";

  return (
    <section className="panel-surface rounded-2xl px-5 py-4">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Languages className="h-4 w-4 text-primary" aria-hidden />
            <Label htmlFor="translation-toggle" className="text-sm">
              Translation
            </Label>
            <Switch
              id="translation-toggle"
              checked={translationEnabled}
              onCheckedChange={toggleTranslation}
            />
          </div>

          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden />
            <Label htmlFor="tuning-toggle" className="text-sm">
              Sound tuning
            </Label>
            <Switch
              id="tuning-toggle"
              checked={soundTuningEnabled}
              onCheckedChange={toggleSoundTuning}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="source-lang" className="text-xs text-muted-foreground">
              Source
            </Label>
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger id="source-lang" className="w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Swap languages"
            className="mb-0.5"
            onClick={() => {
              const s = sourceLang;
              setSourceLang(targetLang);
              setTargetLang(s);
            }}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <div className="grid gap-1.5">
            <Label htmlFor="target-lang" className="text-xs text-muted-foreground">
              Target
            </Label>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger id="target-lang" className="w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={!live || !liveSessionId || hangUpMutation.isPending}
            onClick={() => liveSessionId && hangUpMutation.mutate(liveSessionId)}
          >
            <PhoneOff className="h-4 w-4" /> End call
          </Button>
        </div>
      </div>
    </section>
  );
}
