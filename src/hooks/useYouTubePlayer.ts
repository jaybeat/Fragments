import { useEffect, useRef, useCallback, useState } from 'react';

let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).YT?.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById('youtube-api-script');
    if (existing) {
      const original = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        original?.();
        resolve();
      };
      return;
    }
    const tag = document.createElement('script');
    tag.id = 'youtube-api-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    (window as any).onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function useYouTubePlayer(videoId: string, startSeconds?: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled || !containerRef.current) return;
      const player = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start: startSeconds || 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            setPlaying(event.data === YT.PlayerState.PLAYING);
          },
        },
      });
      playerRef.current = player;
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      setReady(false);
      setPlaying(false);
    };
  }, [videoId, startSeconds]);

  const play = useCallback(() => {
    playerRef.current?.playVideo?.();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.();
  }, []);

  const seekTo = useCallback((seconds: number, allowSeekAhead = true) => {
    playerRef.current?.seekTo?.(seconds, allowSeekAhead);
  }, []);

  const getCurrentTime = useCallback((): number => {
    return playerRef.current?.getCurrentTime?.() ?? 0;
  }, []);

  const getDuration = useCallback((): number => {
    return playerRef.current?.getDuration?.() ?? 0;
  }, []);

  return {
    containerRef,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getDuration,
    isReady: ready,
    isPlaying: playing,
  };
}
