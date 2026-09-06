import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Loader2,
  Mic,
  PhoneCall,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { LANGUAGES } from "@/context/CallStudioContext";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/voice-models")({
  head: () => ({
    meta: [
      { title: "Voice Models — Karacter Hub | Deep Call Live" },
      {
        name: "description",
        content:
          "Choose a trained voice for your live calls, or build your own by uploading recordings and refining tone, clarity and pace.",
      },
      { property: "og:title", content: "Voice Models — Karacter Hub | Deep Call Live" },
      {
        property: "og:description",
        content: "Pick a trained voice or train your own from your own recordings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoiceModelsPage,
});

type VoiceModel = Tables<"voice_models">;
type VoiceSample = Tables<"voice_samples">;

const GENDERS = ["female", "male", "neutral"];
const STYLES = ["conversational", "professional", "energetic", "calm", "narration"];

function langLabel(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

function VoiceModelsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const voices = useQuery({
    queryKey: ["voice-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_models")
        .select("*")
        .order("is_preset", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data as VoiceModel[];
    },
  });

  const presets = useMemo(
    () => voices.data?.filter((v) => v.is_preset) ?? [],
    [voices.data],
  );
  const custom = useMemo(
    () => voices.data?.filter((v) => !v.is_preset) ?? [],
    [voices.data],
  );
  const activeVoice = useMemo(
    () => voices.data?.find((v) => v.id === selectedId) ?? null,
    [voices.data, selectedId],
  );

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      await supabase
        .from("voice_models")
        .update({ is_default: false })
        .eq("user_id", uid)
        .eq("is_default", true);
      const target = voices.data?.find((v) => v.id === id);
      if (target?.is_preset) {
        // Presets are shared, so pin them by cloning into the user's library.
        const { error } = await supabase.from("voice_models").insert({
          user_id: uid,
          name: target.name,
          description: target.description,
          language: target.language,
          gender: target.gender,
          style: target.style,
          provider: target.provider,
          provider_voice_id: target.provider_voice_id,
          stability: target.stability,
          similarity: target.similarity,
          speed: target.speed,
          pitch: target.pitch,
          is_default: true,
        });
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase
        .from("voice_models")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Call voice updated");
      void queryClient.invalidateQueries({ queryKey: ["voice-models"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createVoice = useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      language: string;
      gender: string;
      style: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You need to be signed in.");
      const { data, error } = await supabase
        .from("voice_models")
        .insert({ ...input, user_id: uid, status: "draft" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as VoiceModel;
    },
    onSuccess: (voice) => {
      toast.success(`${voice.name} created — add recordings to refine it.`);
      setCreating(false);
      setSelectedId(voice.id);
      void queryClient.invalidateQueries({ queryKey: ["voice-models"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteVoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voice_models").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Voice deleted");
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ["voice-models"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            <span className="text-gradient-signal">Voice models</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the voice that speaks your translated replies on live calls — or build your own
            from recordings and fine-tune how it sounds.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/call-studio">
            <PhoneCall className="h-4 w-4" /> Open Call Studio
          </Link>
        </Button>
      </header>

      <section className="panel-surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Trained voices
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready-made voices trained for phone calls across languages.
        </p>
        {voices.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {presets.map((v) => (
              <VoiceCard
                key={v.id}
                voice={v}
                selected={selectedId === v.id}
                onSelect={() => setSelectedId(v.id)}
                onUse={() => setDefault.mutate(v.id)}
                busy={setDefault.isPending}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="panel-surface rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Mic className="h-4 w-4 text-primary" aria-hidden /> Your voices
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Custom voices you build from your own recordings.
            </p>
          </div>
          <Button onClick={() => setCreating((c) => !c)} variant={creating ? "ghost" : "default"}>
            <Plus className="h-4 w-4" /> {creating ? "Cancel" : "New voice"}
          </Button>
        </div>

        {creating ? (
          <CreateVoiceForm
            pending={createVoice.isPending}
            onCreate={(input) => createVoice.mutate(input)}
          />
        ) : null}

        {custom.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {custom.map((v) => (
              <VoiceCard
                key={v.id}
                voice={v}
                selected={selectedId === v.id}
                onSelect={() => setSelectedId(v.id)}
                onUse={() => setDefault.mutate(v.id)}
                onDelete={() => deleteVoice.mutate(v.id)}
                busy={setDefault.isPending || deleteVoice.isPending}
              />
            ))}
          </ul>
        ) : !creating ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No custom voices yet — start one and upload a few clear recordings.
          </p>
        ) : null}
      </section>

      {activeVoice ? <VoiceEditor voice={activeVoice} /> : null}
    </div>
  );
}

function VoiceCard({
  voice,
  selected,
  onSelect,
  onUse,
  onDelete,
  busy,
}: {
  voice: VoiceModel;
  selected: boolean;
  onSelect: () => void;
  onUse: () => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  return (
    <li
      className={`rounded-xl border bg-card px-4 py-3 transition-colors ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{voice.name}</p>
          <div className="flex items-center gap-1.5">
            {voice.is_default ? <Badge>In use</Badge> : null}
            <Badge variant="secondary">{langLabel(voice.language)}</Badge>
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {voice.description ?? "Custom voice"}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {voice.gender} · {voice.style} · {voice.status}
        </p>
      </button>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy || voice.is_default} onClick={onUse}>
          <Check className="h-4 w-4" /> {voice.is_default ? "Active" : "Use on calls"}
        </Button>
        {onDelete ? (
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Delete ${voice.name}`}
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function CreateVoiceForm({
  pending,
  onCreate,
}: {
  pending: boolean;
  onCreate: (input: {
    name: string;
    description: string;
    language: string;
    gender: string;
    style: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [gender, setGender] = useState("neutral");
  const [style, setStyle] = useState("conversational");

  return (
    <form
      className="mt-4 grid gap-4 rounded-xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          toast.error("Give the voice a name first.");
          return;
        }
        onCreate({ name: name.trim(), description: description.trim(), language, gender, style });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="voice-name">Name</Label>
        <Input
          id="voice-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Support desk voice"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="voice-desc">Description</Label>
        <Textarea
          id="voice-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Friendly, unhurried, slight Lagos accent."
          rows={2}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="voice-lang">Language</Label>
          <select
            id="voice-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="voice-gender">Tone</Label>
          <select
            id="voice-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="voice-style">Style</Label>
          <select
            id="voice-style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create voice
        </Button>
      </div>
    </form>
  );
}

function VoiceEditor({ voice }: { voice: VoiceModel }) {
  const queryClient = useQueryClient();
  const editable = !voice.is_preset;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tuning, setTuning] = useState({
    stability: Number(voice.stability),
    similarity: Number(voice.similarity),
    speed: Number(voice.speed),
    pitch: Number(voice.pitch),
  });

  useEffect(() => {
    setTuning({
      stability: Number(voice.stability),
      similarity: Number(voice.similarity),
      speed: Number(voice.speed),
      pitch: Number(voice.pitch),
    });
  }, [voice.id, voice.stability, voice.similarity, voice.speed, voice.pitch]);

  const samples = useQuery({
    queryKey: ["voice-samples", voice.id],
    enabled: editable,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_samples")
        .select("*")
        .eq("voice_model_id", voice.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as VoiceSample[];
    },
  });

  const saveTuning = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("voice_models")
        .update({ ...tuning, status: "ready" })
        .eq("id", voice.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Voice refined");
      void queryClient.invalidateQueries({ queryKey: ["voice-models"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error("You need to be signed in.");
        for (const file of Array.from(files)) {
          const ext = file.name.split(".").pop() ?? "webm";
          const path = `${uid}/${voice.id}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("voice-samples")
            .upload(path, file, { contentType: file.type || "audio/webm" });
          if (upErr) throw new Error(upErr.message);
          const { error: rowErr } = await supabase.from("voice_samples").insert({
            user_id: uid,
            voice_model_id: voice.id,
            label: file.name,
            file_path: path,
            size_bytes: file.size,
          });
          if (rowErr) throw new Error(rowErr.message);
        }
        await supabase
          .from("voice_models")
          .update({ status: "training" })
          .eq("id", voice.id);
        toast.success("Recordings added");
        void queryClient.invalidateQueries({ queryKey: ["voice-samples", voice.id] });
        void queryClient.invalidateQueries({ queryKey: ["voice-models"] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [voice.id, queryClient],
  );

  const removeSample = useMutation({
    mutationFn: async (sample: VoiceSample) => {
      await supabase.storage.from("voice-samples").remove([sample.file_path]);
      const { error } = await supabase.from("voice_samples").delete().eq("id", sample.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["voice-samples", voice.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="panel-surface rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Volume2 className="h-4 w-4 text-primary" aria-hidden /> Refine “{voice.name}”
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {editable
              ? "Upload clear recordings and shape how the voice sounds on calls."
              : "Built-in voices can't be changed — create your own to customise it."}
          </p>
        </div>
        {editable ? (
          <Button disabled={saveTuning.isPending} onClick={() => saveTuning.mutate()}>
            {saveTuning.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="grid gap-5">
          <TuneSlider
            label="Consistency"
            hint="Higher keeps the voice steady; lower makes it more expressive."
            value={tuning.stability}
            min={0}
            max={1}
            step={0.05}
            disabled={!editable}
            onChange={(v) => setTuning((t) => ({ ...t, stability: v }))}
          />
          <TuneSlider
            label="Likeness"
            hint="How closely it copies your recordings."
            value={tuning.similarity}
            min={0}
            max={1}
            step={0.05}
            disabled={!editable}
            onChange={(v) => setTuning((t) => ({ ...t, similarity: v }))}
          />
          <TuneSlider
            label="Pace"
            hint="Speaking speed."
            value={tuning.speed}
            min={0.5}
            max={1.5}
            step={0.01}
            disabled={!editable}
            onChange={(v) => setTuning((t) => ({ ...t, speed: v }))}
          />
          <TuneSlider
            label="Pitch"
            hint="Deeper or brighter."
            value={tuning.pitch}
            min={-10}
            max={10}
            step={1}
            disabled={!editable}
            onChange={(v) => setTuning((t) => ({ ...t, pitch: v }))}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Recordings</h3>
            {editable ? (
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload audio
              </Button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          {editable ? (
            samples.data && samples.data.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {samples.data.map((s) => (
                  <SampleRow
                    key={s.id}
                    sample={s}
                    onRemove={() => removeSample.mutate(s)}
                    removing={removeSample.isPending}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No recordings yet. Two or three minutes of clean speech gives the best result.
              </p>
            )
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              This voice is already trained and ready to use.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function SampleRow({
  sample,
  onRemove,
  removing,
}: {
  sample: VoiceSample;
  onRemove: () => void;
  removing: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.storage
      .from("voice-samples")
      .createSignedUrl(sample.file_path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [sample.file_path]);

  return (
    <li className="rounded-xl border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm">{sample.label ?? "Recording"}</p>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete recording"
          disabled={removing}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {url ? <audio controls src={url} className="mt-2 w-full" /> : null}
    </li>
  );
}

function TuneSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
