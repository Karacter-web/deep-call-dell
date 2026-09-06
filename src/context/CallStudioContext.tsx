import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { useLiveCall } from "@/hooks/useLiveCall";

export type CallStatus = "idle" | "connecting" | "active" | "ended";

export type TranscriptLine = {
  id: string;
  speaker: "caller" | "agent";
  text: string;
  at: number;
  partial?: boolean;
};

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "ar", label: "Arabic" },
] as const;

type State = {
  callStatus: CallStatus;
  translationEnabled: boolean;
  soundTuningEnabled: boolean;
  sourceLang: string;
  targetLang: string;
  callerNumber: string | null;
  startedAt: number | null;
  inputLevel: number;
  incoming: TranscriptLine[];
  translated: TranscriptLine[];
};

type Action =
  | { type: "status"; status: CallStatus }
  | { type: "toggleTranslation" }
  | { type: "toggleSoundTuning" }
  | { type: "sourceLang"; value: string }
  | { type: "targetLang"; value: string }
  | { type: "caller"; value: string | null }
  | { type: "level"; value: number }
  | { type: "incoming"; line: TranscriptLine }
  | { type: "translated"; line: TranscriptLine }
  | { type: "reset" };

const initialState: State = {
  callStatus: "idle",
  translationEnabled: true,
  soundTuningEnabled: true,
  sourceLang: "en",
  targetLang: "es",
  callerNumber: null,
  startedAt: null,
  inputLevel: 0,
  incoming: [],
  translated: [],
};

function upsert(lines: TranscriptLine[], line: TranscriptLine) {
  const idx = lines.findIndex((l) => l.id === line.id);
  if (idx === -1) return [...lines, line].slice(-200);
  const next = [...lines];
  next[idx] = line;
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "status":
      return {
        ...state,
        callStatus: action.status,
        startedAt:
          action.status === "active" ? (state.startedAt ?? Date.now()) : state.startedAt,
      };
    case "toggleTranslation":
      return { ...state, translationEnabled: !state.translationEnabled };
    case "toggleSoundTuning":
      return { ...state, soundTuningEnabled: !state.soundTuningEnabled };
    case "sourceLang":
      return { ...state, sourceLang: action.value };
    case "targetLang":
      return { ...state, targetLang: action.value };
    case "caller":
      return { ...state, callerNumber: action.value };
    case "level":
      return { ...state, inputLevel: action.value };
    case "incoming":
      return { ...state, incoming: upsert(state.incoming, action.line) };
    case "translated":
      return { ...state, translated: upsert(state.translated, action.line) };
    case "reset":
      return {
        ...initialState,
        translationEnabled: state.translationEnabled,
        soundTuningEnabled: state.soundTuningEnabled,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        callStatus: "ended",
      };
    default:
      return state;
  }
}

type CallStudioContextValue = State & {
  liveSessionId: string | null;
  isLiveCall: boolean;
  endCall: () => void;
  toggleTranslation: () => void;
  toggleSoundTuning: () => void;
  setSourceLang: (v: string) => void;
  setTargetLang: (v: string) => void;
  setInputLevel: (v: number) => void;
};

const CallStudioContext = createContext<CallStudioContextValue | null>(null);

export function CallStudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { sessionId: liveSessionId, isLive: isLiveCall } = useLiveCall({
    onCallStatus: (status, caller) => {
      dispatch({ type: "status", status });
      if (caller !== undefined) dispatch({ type: "caller", value: caller });
    },
    onIncoming: (line) => dispatch({ type: "incoming", line }),
    onTranslated: (line) => dispatch({ type: "translated", line }),
  });

  const endCall = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const value = useMemo<CallStudioContextValue>(
    () => ({
      ...state,
      liveSessionId,
      isLiveCall,
      endCall,
      toggleTranslation: () => dispatch({ type: "toggleTranslation" }),
      toggleSoundTuning: () => dispatch({ type: "toggleSoundTuning" }),
      setSourceLang: (v: string) => dispatch({ type: "sourceLang", value: v }),
      setTargetLang: (v: string) => dispatch({ type: "targetLang", value: v }),
      setInputLevel: (v: number) => dispatch({ type: "level", value: v }),
    }),
    [state, liveSessionId, isLiveCall, endCall],
  );

  return <CallStudioContext.Provider value={value}>{children}</CallStudioContext.Provider>;
}

export function useCallStudio() {
  const ctx = useContext(CallStudioContext);
  if (!ctx) throw new Error("useCallStudio must be used inside <CallStudioProvider>");
  return ctx;
}
