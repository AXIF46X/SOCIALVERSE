"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Settings2, Captions, Keyboard, Check, X,
} from "lucide-react";
import { cn, formatDuration, toast } from "@/lib/utils";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const CC_CUES: [number, string][] = [
  [0, "Welcome back to the channel."],
  [4, "Today we're rebuilding this setup from scratch."],
  [9, "Everything you see here is in the description."],
  [15, "Let's get into it."],
  [22, "Pay attention to this part — it's the trick."],
  [31, "And that's why the details matter."],
  [40, "Thanks for watching — see you in the next one."],
];

export function WatchPlayer({
  videoId, videoUrl, poster, title, chapters, startAt, nextVideoId,
}: {
  videoId: string;
  videoUrl: string;
  poster: string;
  title: string;
  chapters: { time: number; label: string }[];
  startAt: number;
  nextVideoId?: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [ccOn, setCcOn] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [ended, setEnded] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const saveProgress = useCallback((time: number) => {
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "progress", videoId, progressSec: Math.floor(time) }),
    }).catch(() => {});
  }, [videoId]);

  /* initial position */
  useEffect(() => {
    const v = videoRef.current;
    if (v && startAt > 2) v.currentTime = startAt;
  }, [startAt]);

  /* periodic progress persistence */
  useEffect(() => {
    if (!playing) return;
    saveTimer.current = window.setInterval(() => {
      const v = videoRef.current;
      if (v) saveProgress(v.currentTime);
    }, 5000);
    return () => { if (saveTimer.current) window.clearInterval(saveTimer.current); };
  }, [playing, saveProgress]);

  /* chapter seek via window event (dispatched by chapter list) */
  useEffect(() => {
    const onSeek = (e: Event) => {
      const t = (e as CustomEvent<number>).detail;
      const v = videoRef.current;
      if (v && Number.isFinite(t)) { v.currentTime = t; v.play().catch(() => {}); }
    };
    window.addEventListener("sv:seek", onSeek);
    return () => window.removeEventListener("sv:seek", onSeek);
  }, []);

  /* auto-advance on end */
  useEffect(() => {
    if (!ended || !autoplay || !nextVideoId) return;
    const t = window.setTimeout(() => router.push(`/watch/${nextVideoId}`), 2500);
    return () => window.clearTimeout(t);
  }, [ended, autoplay, nextVideoId, router]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || Infinity);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch {}
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => {
    const next = !m;
    if (videoRef.current) videoRef.current.muted = next;
    return next;
  }), []);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const v = videoRef.current;
      switch (e.key.toLowerCase()) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "arrowleft": e.preventDefault(); skip(-5); break;
        case "arrowright": e.preventDefault(); skip(5); break;
        case "j": skip(-10); break;
        case "l": skip(10); break;
        case "arrowup": e.preventDefault(); setVolume((x) => { const nv = Math.min(1, x + 0.1); if (v) { v.volume = nv; } return nv; }); break;
        case "arrowdown": e.preventDefault(); setVolume((x) => { const nv = Math.max(0, x - 0.1); if (v) { v.volume = nv; } return nv; }); break;
        case "f": toggleFullscreen(); break;
        case "m": toggleMute(); break;
        case "?": setShortcutsOpen((s) => !s); break;
        case "0": if (v) v.playbackRate = 1; setSpeed(1); break;
        case "1": if (v) v.playbackRate = 1.25; setSpeed(1.25); break;
        case "2": if (v) v.playbackRate = 1.5; setSpeed(1.5); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip, toggleFullscreen, toggleMute, togglePlay]);

  /* auto-hide controls while playing */
  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setControlsVisible(false); }, 2600);
  }, []);

  const activeCue = ccOn ? CC_CUES.filter(([t]) => t <= currentTime).slice(-1)[0]?.[1] : undefined;

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full select-none overflow-hidden bg-black sm:rounded-2xl sm:border sm:border-white/10"
      onMouseMove={pokeControls}
      onMouseLeave={() => videoRef.current && !videoRef.current.paused && setControlsVisible(false)}
      role="region"
      aria-label={`Video player: ${title}`}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={poster}
        className="h-full w-full object-contain"
        playsInline
        autoPlay
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); videoRef.current && saveProgress(videoRef.current.currentTime); }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setEnded(true)}
      />

      {/* captions overlay */}
      {activeCue && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 max-w-[80%] -translate-x-1/2 rounded-lg bg-black/80 px-3.5 py-1.5 text-center text-sm font-medium text-white sm:text-base">
          {activeCue}
        </div>
      )}

      {/* autoplay-next overlay */}
      {ended && autoplay && nextVideoId && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/60">Up next</p>
          <p className="max-w-md text-center text-lg font-bold text-white">Playing the next recommendation…</p>
          <button onClick={() => router.push(`/watch/${nextVideoId}`)} className="btn btn-primary mt-2">Play now</button>
          <button onClick={() => setAutoplay(false)} className="text-xs font-semibold text-white/60 underline hover:text-white">Cancel autoplay</button>
        </div>
      )}

      {/* big play button when paused */}
      {!playing && !ended && (
        <button onClick={togglePlay} aria-label="Play" className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform hover:scale-110">
          <Play size={30} className="ml-1 fill-white" />
        </button>
      )}

      {/* control bar */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300",
        controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0"
      )}>
        {/* seek bar */}
        <SeekBar current={currentTime} duration={duration} chapters={chapters} onSeek={(t) => { if (videoRef.current) videoRef.current.currentTime = t; }} />

        <div className="mt-1 flex items-center gap-2 text-white sm:gap-3">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15">
            {playing ? <Pause size={21} className="fill-white" /> : <Play size={21} className="ml-0.5 fill-white" />}
          </button>
          <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15">
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
            onChange={(e) => { const nv = Number(e.target.value); setVolume(nv); setMuted(nv === 0); if (videoRef.current) { videoRef.current.volume = nv; videoRef.current.muted = nv === 0; } }}
            aria-label="Volume"
            className="h-1 w-16 cursor-pointer accent-fuchsia-500 sm:w-24"
          />
          <span className="min-w-16 text-[0.72rem] font-medium tabular-nums text-white/90">
            {formatDuration(currentTime)} <span className="text-white/45">/ {formatDuration(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* autoplay toggle */}
            <button onClick={() => setAutoplay((v) => !v)} role="switch" aria-checked={autoplay} aria-label="Autoplay" className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-white/85 transition-colors hover:bg-white/10" title="Autoplay next video">
              Autoplay
              <span className={cn("relative h-4 w-7 rounded-full transition-colors", autoplay ? "bg-emerald-500" : "bg-white/25")}>
                <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", autoplay ? "left-3.5" : "left-0.5")} />
              </span>
            </button>
            <button onClick={() => setCcOn((v) => !v)} aria-pressed={ccOn} aria-label="Toggle subtitles" className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15", ccOn && "bg-white/20 text-cyan-300")}>
              <Captions size={19} />
            </button>
            {/* speed menu */}
            <div className="relative">
              <button onClick={() => setSpeedOpen((v) => !v)} aria-label="Playback speed" aria-expanded={speedOpen} className="flex h-9 items-center gap-1 rounded-full px-2 text-xs font-bold transition-colors hover:bg-white/15">
                <Settings2 size={16} />{speed}×
              </button>
              {speedOpen && (
                <div className="absolute bottom-11 right-0 z-20 w-28 overflow-hidden rounded-2xl border border-white/10 bg-[#17171f]/95 p-1 shadow-2xl backdrop-blur-xl">
                  {SPEEDS.map((s) => (
                    <button key={s} onClick={() => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; setSpeedOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10">
                      {s}× {s === 1 && <span className="text-white/40">Normal</span>}{s === speed && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts" className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15 sm:flex">
              <Keyboard size={18} />
            </button>
            <button onClick={toggleFullscreen} aria-label="Fullscreen" className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15">
              <Maximize size={19} />
            </button>
          </div>
        </div>
      </div>

      {/* keyboard shortcut sheet */}
      {shortcutsOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="w-72 rounded-2xl border border-white/10 bg-[#17171f] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display font-bold text-white">Keyboard shortcuts</p>
              <button onClick={() => setShortcutsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10" aria-label="Close"><X size={17} /></button>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.8rem] text-white/85">
              {[["Space / K", "Play / pause"], ["← / →", "±5 seconds"], ["J / L", "±10 seconds"], ["↑ / ↓", "Volume"], ["F", "Fullscreen"], ["M", "Mute"], ["0 / 1 / 2", "1× / 1.25× / 1.5×"], ["?", "Toggle this panel"]].map(([key, action]) => (
                <li key={key} className="flex flex-col">
                  <kbd className="w-fit rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[0.7rem] font-bold text-cyan-300">{key}</kbd>
                  <span className="mt-0.5 text-[0.72rem] text-white/70">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SeekBar({ current, duration, chapters, onSeek }: {
  current: number; duration: number; chapters: { time: number; label: string }[]; onSeek: (t: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const safeDuration = duration > 0 ? duration : 1;
  const pct = Math.min(100, (current / safeDuration) * 100);

  const seekFromEvent = (e: React.PointerEvent) => {
    const rect = barRef.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * safeDuration);
  };

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(safeDuration)}
      aria-valuenow={Math.round(current)}
      tabIndex={0}
      className="group/bar relative h-4 cursor-pointer touch-none"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); seekFromEvent(e); }}
      onPointerMove={(e) => {
        const rect = barRef.current!.getBoundingClientRect();
        setHover(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
        if (e.buttons === 1) seekFromEvent(e);
      }}
      onPointerLeave={() => setHover(null)}
    >
      <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-white/25 transition-all group-hover/bar:h-[7px]">
        {/* chapter ticks */}
        {chapters.map((ch) => (
          <span key={ch.time} className="absolute top-0 h-full w-0.5 bg-black/70" style={{ left: `${(ch.time / safeDuration) * 100}%` }} />
        ))}
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" style={{ width: `${pct}%` }} />
      </div>
      <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400 shadow ring-2 ring-black/30" style={{ left: `${pct}%` }} />
      {hover !== null && (
        <div className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-md bg-black/85 px-1.5 py-0.5 text-[0.68rem] font-semibold tabular-nums text-white" style={{ left: `${hover * 100}%` }}>
          {formatDuration(hover * safeDuration)}
        </div>
      )}
    </div>
  );
}
