/** Fragments of well-known quotations and lyrics. A quote containing one is dropped rather than shown as original. */
const FAMOUS_FRAGMENTS = [
  'be the change', 'journey of a thousand', 'stay hungry', 'just do it', 'follow your dreams', 'shoot for the moon', 'dream big',
  'the only way to do great work', 'what doesn\'t kill you', 'carpe diem', 'live laugh love', 'you miss 100', 'not all those who wander',
  'imagine all the people', 'somewhere over the rainbow', 'don\'t stop believin', 'i have a dream', 'to thine own self', 'yes we can',
];

const ATTRIBUTION = /\s*[-–—―]\s*[\p{Lu}][\p{L}.'’ -]{1,40}$/u;
const WRAPPING = /^["'“”‘’«»]+|["'“”‘’«»]+$/g;

export function cleanQuote(quote: string): string {
  return quote.trim().replace(ATTRIBUTION, '').trim().replace(WRAPPING, '').replace(/\s+/g, ' ').trim();
}

export function isAcceptableQuote(quote: string): boolean {
  if (quote.length < 8 || quote.length > 130) return false;
  const words = quote.split(/\s+/).length;
  if (words > 18) return false;
  const lower = quote.toLowerCase().replace(/’/g, "'");
  return !FAMOUS_FRAGMENTS.some((f) => lower.includes(f));
}

export function filterQuotes(quotes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of quotes) {
    const quote = cleanQuote(raw);
    const key = quote.toLowerCase();
    if (isAcceptableQuote(quote) && !seen.has(key)) {
      seen.add(key);
      out.push(quote);
    }
  }
  return out;
}

export type ThemeKey = 'travel' | 'career' | 'wellness' | 'study' | 'creativity' | 'lifestyle' | 'general';

/** Original lines written for this project. Three voices per theme: dreamy, bold, minimal. */
export const QUOTE_BANK: Record<ThemeKey, string[]> = {
  travel: ['Make space for the days you dream about.', 'Book the ticket your future self will thank you for.', 'A little closer to your own horizon.', 'Somewhere warm is already saving you a seat.', 'Go where the mornings feel longer.', 'Pack light. Stay curious.'],
  career: ['Make room for the life you are building.', 'Walk in like the work already knows your name.', 'Quietly, then all at once.', 'Every small yes is laying another floor.', 'Do the brave thing before the meeting starts.', 'Build it. Then build on it.'],
  wellness: ['Soft mornings count as progress.', 'Protect your energy like it pays the rent.', 'Slow is still moving.', 'Let today be gentle and still be enough.', 'Your calm is worth the boundary.', 'Breathe first. Then begin.'],
  study: ['One page today is a door tomorrow.', 'Be the person who stayed for one more chapter.', 'Small notes. Big rooms.', 'Your curiosity is compounding while you sleep.', 'Show up to the desk and the rest follows.', 'Learn it. Keep it.'],
  creativity: ['Make the thing only you would make.', 'Finished beats perfect in every gallery that counts.', 'Start with one bright mark.', 'Your odd idea is the good one.', 'Fill the page before you judge the page.', 'Make more. Worry less.'],
  lifestyle: ['Build a life that feels like your favorite room.', 'Say yes to the version of you with better plans.', 'Keep what feels like home.', 'Fresh flowers, clear calendar, open windows.', 'You are allowed to want the beautiful thing.', 'Choose ease. Often.'],
  general: ['Your next chapter can feel like sunshine.', 'Start before the plan looks perfect.', 'Keep going, softly.', 'What you picture here, you can walk toward.', 'Make a little room for what is coming.', 'Begin anyway.'],
};

export function bankQuotes(theme: ThemeKey, offset = 0, exclude: string[] = []): string[] {
  const lines = QUOTE_BANK[theme].filter((q) => !exclude.includes(q));
  const pool = lines.length >= 3 ? lines : QUOTE_BANK[theme];
  return [0, 1, 2].map((i) => pool[(offset + i) % pool.length]);
}
