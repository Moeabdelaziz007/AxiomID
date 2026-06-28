"use client";

import { useState, useRef } from "react";

export default function DemoVideo() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    if (playing) {
      videoRef.current?.pause();
      setPlaying(false);
      videoRef.current?.play().catch(() => setPlaying(false));
      setPlaying(true);
  }

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent group">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/demo.mp4"
        poster="/axiomid-banner.png"
        playsInline
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      {!playing && (
        <>
          <button
            onClick={handlePlay}
            className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
            aria-label="Play demo video"
          >
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
              <svg className="w-8 h-8 text-white ms-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
          <div className="absolute bottom-4 start-4 end-4 text-center z-10">
            <p className="text-sm text-zinc-400 font-mono">Watch how AxiomID creates your sovereign identity in seconds.</p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </>
      )}
    </div>
  );
}
