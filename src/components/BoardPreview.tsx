'use client';

import { useEffect, useRef, useState } from 'react';
import { loadAll } from '@/lib/images/loader';
import { ensureFonts } from '@/lib/scene/fonts';
import { sceneFonts } from '@/lib/scene/operations';
import { renderScene } from '@/lib/scene/render';
import type { Asset, Scene } from '@/lib/scene/types';

/** Draws a real scene with the same renderer the export uses, so what's shown is what comes out. */
export function BoardPreview({ scene, assets, label, className = '' }: { scene: Scene; assets: Asset[]; label: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ lookup }] = await Promise.all([loadAll(assets), ensureFonts(sceneFonts(scene))]);
      const canvas = ref.current;
      if (cancelled || !canvas) return;
      const scale = 960 / Math.max(scene.width, scene.height);
      canvas.width = Math.round(scene.width * scale);
      canvas.height = Math.round(scene.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderScene(ctx, scene, lookup, { scale });
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [scene, assets]);

  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `${scene.width} / ${scene.height}` }}>
      {!ready && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      <canvas ref={ref} role="img" aria-label={label} className="block size-full" />
    </div>
  );
}
