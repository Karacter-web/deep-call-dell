import type { CallStatus, TranscriptLine } from "@/context/CallStudioContext";

type Handlers = {
  onStatus: (connected: boolean, mock: boolean) => void;
  onIncoming: (line: TranscriptLine) => void;
  onTranslated: (line: TranscriptLine) => void;
  onCallStatus: (status: CallStatus, callerNumber?: string | null) => void;
  onLevel: (value: number) => void;
};

export type StudioSettings = {
  translationEnabled: boolean;
  soundTuningEnabled: boolean;
  sourceLang: string;
  targetLang: string;
};

export type StudioStream = {
  startCall: () => void;
  endCall: () => void;
  updateSettings: (settings: StudioSettings) => void;
  sendAudioChunk: (chunk: ArrayBuffer) => void;
  dispose: () => void;
};

const BACKEND_URL = import.meta.env["VITE_BACKEND_WS_URL"] as string | undefined;

const MOCK_SCRIPT: Array<{ text: string; translated: string }> = [
  {
    text: "Hi, thanks for calling Karacter Hub. How can I help you today?",
    translated: "Hola, gracias por llamar a Karacter Hub. ¿En qué puedo ayudarle hoy?",
  },
  {
    text: "I placed an order last week and it hasn't shipped yet.",
    translated: "Hice un pedido la semana pasada y todavía no se ha enviado.",
  },
  {
    text: "Let me pull that up — can you confirm the order reference?",
    translated: "Déjeme buscarlo, ¿puede confirmar la referencia del pedido?",
  },
  {
    text: "Sure, it's KH dash four four two nine.",
    translated: "Claro, es KH guion cuatro cuatro dos nueve.",
  },
  {
    text: "Got it. The package left our warehouse this morning.",
    translated: "Entendido. El paquete salió de nuestro almacén esta mañana.",
  },
  {
    text: "You should receive a tracking link within the hour.",
    translated: "Debería recibir un enlace de seguimiento dentro de una hora.",
  },
];

/**
 * Connects to the FastAPI backend over Socket.io when VITE_BACKEND_WS_URL is set.
 * Otherwise falls back to a deterministic mock stream so the studio is usable
 * before the Python service is running.
 */
export function connectStudioStream(handlers: Handlers): StudioStream {
  if (BACKEND_URL) {
    return createSocketStream(BACKEND_URL, handlers);
  }
  return createMockStream(handlers);
}

function createSocketStream(url: string, handlers: Handlers): StudioStream {
  let settings: StudioSettings | null = null;
  let disposed = false;
  let socket: import("socket.io-client").Socket | null = null;

  void import("socket.io-client").then(({ io }) => {
    if (disposed) return;
    socket = io(url, { transports: ["websocket"] });
    socket.on("connect", () => handlers.onStatus(true, false));
    socket.on("disconnect", () => handlers.onStatus(false, false));
    socket.on("transcript", (line: TranscriptLine) => handlers.onIncoming(line));
    socket.on("translation", (line: TranscriptLine) => handlers.onTranslated(line));
    socket.on("call_status", (p: { status: CallStatus; caller?: string | null }) =>
      handlers.onCallStatus(p.status, p.caller ?? null),
    );
    socket.on("audio_level", (p: { level: number }) => handlers.onLevel(p.level));
    if (settings) socket.emit("settings", settings);
  });

  return {
    startCall: () => socket?.emit("start_call"),
    endCall: () => socket?.emit("end_call"),
    updateSettings: (next) => {
      settings = next;
      socket?.emit("settings", next);
    },
    sendAudioChunk: (chunk) => socket?.emit("audio_chunk", chunk),
    dispose: () => {
      disposed = true;
      socket?.disconnect();
      socket = null;
    },
  };
}

function createMockStream(handlers: Handlers): StudioStream {
  let settings: StudioSettings = {
    translationEnabled: true,
    soundTuningEnabled: true,
    sourceLang: "en",
    targetLang: "es",
  };
  const timers: ReturnType<typeof setTimeout>[] = [];
  let levelTimer: ReturnType<typeof setInterval> | null = null;
  let index = 0;
  let running = false;

  setTimeout(() => handlers.onStatus(true, true), 300);

  const clearTimers = () => {
    timers.splice(0).forEach(clearTimeout);
    if (levelTimer) clearInterval(levelTimer);
    levelTimer = null;
  };

  const emitLine = () => {
    if (!running) return;
    const entry = MOCK_SCRIPT[index % MOCK_SCRIPT.length]!;
    const id = `mock-${index}-${Date.now()}`;
    const speaker: TranscriptLine["speaker"] = index % 2 === 0 ? "agent" : "caller";
    index += 1;

    const words = entry.text.split(" ");
    words.forEach((_, i) => {
      timers.push(
        setTimeout(
          () =>
            handlers.onIncoming({
              id,
              speaker,
              text: words.slice(0, i + 1).join(" "),
              at: Date.now(),
              partial: i < words.length - 1,
            }),
          i * 160,
        ),
      );
    });

    const finishedAt = words.length * 160 + 320;
    if (settings.translationEnabled) {
      timers.push(
        setTimeout(
          () =>
            handlers.onTranslated({
              id,
              speaker,
              text: entry.translated,
              at: Date.now(),
            }),
          finishedAt,
        ),
      );
    }
    timers.push(setTimeout(emitLine, finishedAt + 900));
  };

  return {
    startCall: () => {
      running = true;
      index = 0;
      handlers.onCallStatus("connecting", "+1 (415) 555-0142");
      timers.push(
        setTimeout(() => {
          handlers.onCallStatus("active", "+1 (415) 555-0142");
          emitLine();
        }, 900),
      );
      levelTimer = setInterval(
        () => handlers.onLevel(0.2 + Math.random() * 0.8),
        120,
      );
    },
    endCall: () => {
      running = false;
      clearTimers();
      handlers.onLevel(0);
      handlers.onCallStatus("ended", null);
    },
    updateSettings: (next) => {
      settings = next;
    },
    sendAudioChunk: () => {},
    dispose: () => {
      running = false;
      clearTimers();
    },
  };
}
