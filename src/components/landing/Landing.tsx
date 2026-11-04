'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { BoardPreview } from '@/components/BoardPreview';
import { Icon } from '@/components/Icon';
import { PageShell } from '@/components/SiteChrome';
import { Sticker } from '@/components/Sticker';
import { DEMO_ASSETS } from '@/lib/assets/demo-library';
import { demoUrl } from '@/lib/platform';
import { seededRandom } from '@/lib/scene/ids';
import { getPalette } from '@/lib/scene/palettes';
import { compose } from '@/lib/scene/templates';
import type { Asset, TemplateId } from '@/lib/scene/types';

function art(...ids: string[]): Asset[] {
  return ids.map((id) => DEMO_ASSETS.find((a) => a.id === `demo-${id}`)).filter((a): a is Asset => Boolean(a));
}

function TileField() {
  const cols = 14;
  const random = seededRandom(9);
  const tiles = Array.from({ length: cols * 8 }, () => (random() * 0.24).toFixed(2));
  return (
    <div className="tile-field" aria-hidden="true">
      <div className="tile-bloom" />
      <div className="tile-grid" style={{ '--cols': cols } as React.CSSProperties}>
        {tiles.map((a, i) => <i key={i} style={{ '--a': a } as React.CSSProperties} />)}
      </div>
      <div className="tile-mask" />
    </div>
  );
}

type Piece = { src: string; alt: string; left: string; top: string; width: string; ratio: string; r: string; fx: string; fy: string; fr: string; delay: number };

const PIECES: Piece[] = [
  { src: '/demo/beach-sunset.jpg', alt: 'Illustrated palm trees at sunset', left: '4%', top: '14%', width: '50%', ratio: '3 / 2', r: '-2deg', fx: '-90px', fy: '30px', fr: '-9deg', delay: 80 },
  { src: '/demo/balloon-sky.jpg', alt: 'Illustrated hot air balloons', left: '58%', top: '9%', width: '27%', ratio: '1 / 1', r: '3deg', fx: '80px', fy: '-40px', fr: '10deg', delay: 200 },
  { src: '/demo/city-dusk.jpg', alt: 'Illustrated city skyline at dusk', left: '48%', top: '54%', width: '34%', ratio: '3 / 2', r: '-1.5deg', fx: '70px', fy: '60px', fr: '8deg', delay: 320 },
  { src: '/demo/soft-petals.jpg', alt: 'Soft pink flower petals', left: '80%', top: '40%', width: '17%', ratio: '1 / 1', r: '4deg', fx: '60px', fy: '20px', fr: '12deg', delay: 430 },
];

function HeroCollage() {
  return (
    <div className="relative" role="img" aria-label="Example wallpaper: travel and city pictures collaged on a desktop with stickers and a short quote">
      <div className="relative aspect-[16/10] overflow-hidden border-2 border-ink bg-blush shadow-[10px_10px_0_#241B32]">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 70% at 20% 90%, #FF9CCB, transparent 70%), radial-gradient(60% 70% at 90% 20%, #CDB8FF, transparent 70%), #FFF1B8' }} />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-white/85 px-3 py-1 text-xs font-medium">
          <span className="flex items-center gap-1.5"><Icon name="Monitor" size={13} />Desktop</span>
          <span>Mon 9:41</span>
        </div>
        {PIECES.map((p) => (
          <div key={p.src} className="piece p-[1.2%] pb-[2.2%]" style={{ left: p.left, top: p.top, width: p.width, aspectRatio: p.ratio, '--r': p.r, '--fx': p.fx, '--fy': p.fy, '--fr': p.fr, '--delay': `${p.delay}ms` } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demoUrl(p.src)} alt="" className="size-full object-cover" />
          </div>
        ))}
        <div className="piece px-[3%] py-[2.5%]" style={{ background: 'var(--color-butter)', left: '8%', top: '68%', width: '38%', '--r': '1.5deg', '--fy': '60px', '--delay': '540ms' } as React.CSSProperties}>
          <p className="text-[clamp(0.85rem,1.7vw,1.5rem)] italic leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>Make space for the days you dream about.</p>
        </div>
        <div className="piece piece-bare drift w-[13%]" style={{ left: '44%', top: '10%', '--r': '-8deg', '--delay': '660ms' } as React.CSSProperties}><Sticker name="sunburst" className="w-full" /></div>
        <div className="piece piece-bare w-[11%]" style={{ left: '83%', top: '74%', '--r': '10deg', '--delay': '720ms' } as React.CSSProperties}><Sticker name="sparkle" color="#BEA4FF" className="w-full" /></div>
        <div className="piece piece-bare w-[12%]" style={{ left: '1%', top: '50%', '--r': '-10deg', '--delay': '780ms' } as React.CSSProperties}><Sticker name="butterfly" className="w-full" /></div>
      </div>
    </div>
  );
}

const EXAMPLES: { title: string; label: string; templateId: TemplateId; palette: string; quote: string; stickers: string[]; assets: Asset[]; fonts: string }[] = [
  { title: 'A summer to remember', label: 'Travel', templateId: 'modern-scrapbook', palette: 'dream-pop', quote: 'Go where the mornings feel longer.', stickers: ['sunburst', 'wave'], assets: art('beach-sunset', 'turquoise-lagoon', 'mountain-dawn', 'white-village', 'balloon-sky'), fonts: 'handmade' },
  { title: 'Building the future', label: 'Career', templateId: 'editorial-grid', palette: 'lilac-hour', quote: 'Make room for the life you are building.', stickers: ['arrow', 'star', 'compass'], assets: art('city-dusk', 'glass-towers', 'sunlit-desk', 'corner-office'), fonts: 'editorial' },
  { title: 'Made by me', label: 'Creative', templateId: 'dream-magazine', palette: 'fuchsia-veil', quote: 'Make the thing only you would make.', stickers: ['vinyl', 'sparkle'], assets: art('paint-studio', 'vinyl-wall', 'soft-petals', 'book-stack'), fonts: 'bold' },
];

const STEPS = [
  { title: 'Show or tell', body: 'Add up to 20 photos, write what you want, or do both.' },
  { title: 'Check the idea', body: 'Review the suggested theme, colors and quotes, and change anything that feels off.' },
  { title: 'Make it yours', body: 'Move, crop and restyle every piece, then download a PNG that fits your screen.' },
];

const FAQ = [
  { q: 'Do I need an account?', a: 'No. You can make and download a wallpaper right away. Without an account your boards are saved in this browser only, so they won’t follow you to another device.' },
  { q: 'What happens to my photos?', a: 'They stay on your device unless you choose otherwise. If this copy of DreamCanvas uses a cloud AI service, it asks you first and sends only small copies. You can delete your photos at any time.' },
  { q: 'What sizes can I download?', a: 'Full HD (1920×1080), QHD (2560×1440), 4K (3840×2160) and a phone size (1080×1920). Files come out at exactly that size.' },
  { q: 'Are the quotes real quotes?', a: 'They’re original lines written for your board, with no invented authors. You can edit them or write your own.' },
  { q: 'Can I change a board later?', a: 'Yes. Boards are saved as separate photos, words and stickers, so everything stays editable when you come back.' },
];

export function Landing() {
  const examples = useMemo(() => EXAMPLES.map((e) => ({
    ...e,
    scene: compose({ templateId: e.templateId, shape: 'landscape', assets: e.assets, title: e.title, quotes: [e.quote], stickerTags: e.stickers, palette: getPalette(e.palette), fontPairId: e.fonts, seed: 4 }).scene,
  })), []);

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b-2 border-ink">
        <TileField />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pb-24 lg:pt-16">
          <div>
            <h1 className="text-[clamp(3.25rem,7.4vw,6.25rem)] font-extrabold leading-[0.92]">Put your dreams on your desktop.</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed">Turn your photos or a few words into a designed wallpaper you can edit, save and download.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/create?mode=photos" className="btn btn-primary text-lg"><Icon name="Upload" />Upload inspiration</Link>
              <Link href="/create?mode=words" className="btn btn-yellow text-lg"><Icon name="Pencil" />Describe your dream</Link>
            </div>
            <p className="mt-5 text-sm text-ink-soft">No account needed to try it.</p>
          </div>
          <HeroCollage />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="text-4xl font-extrabold">Three steps, a few minutes</h2>
        <ol className="mt-8 grid gap-0 border-2 border-ink md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-ink p-6 max-md:[&:not(:last-child)]:border-b-2 md:[&:not(:last-child)]:border-r-2">
              <span className="grid size-10 place-items-center border-2 border-ink bg-lilac text-lg font-bold">{i + 1}</span>
              <h3 className="mt-4 text-2xl font-bold">{step.title}</h3>
              <p className="mt-2 text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y-2 border-ink bg-blush" aria-labelledby="examples">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 id="examples" className="text-4xl font-extrabold">Made with the layouts you get</h2>
          <p className="mt-2 max-w-xl text-ink-soft">These boards are drawn live on this page by the same engine that makes your download.</p>
          <div className="mt-8 grid gap-7 md:grid-cols-3">
            {examples.map((e) => (
              <figure key={e.title} className="panel shadow-[4px_4px_0_#241B32]">
                <BoardPreview scene={e.scene} assets={e.assets} label={`${e.label} example wallpaper titled ${e.title}`} />
                <figcaption className="flex items-center justify-between border-t-2 border-ink px-3 py-2 text-sm font-semibold">
                  <span>{e.label}</span>
                  <span className="font-normal text-ink-soft">{e.templateId.replace('-', ' ')}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" aria-labelledby="faq">
        <div>
          <h2 id="faq" className="text-4xl font-extrabold">Questions</h2>
          <Link href="/create" className="btn btn-primary mt-6">Make your board</Link>
        </div>
        <div className="border-2 border-ink">
          {FAQ.map((item, i) => (
            <details key={item.q} className={i ? 'border-t-2 border-ink' : ''}>
              <summary className="cursor-pointer list-none px-4 py-3 text-lg font-semibold hover:bg-blush">{item.q}</summary>
              <p className="px-4 pb-4 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
