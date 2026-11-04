import { PageShell } from '@/components/SiteChrome';
import { PageHeading } from '@/components/ui';

export function PrivacyPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 leading-relaxed sm:px-6">
        <PageHeading title="Privacy and image credits" />
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">Your photos</h2>
          <p>Photos are prepared on your device, which also removes location data. Without an account they’re kept in this browser and go nowhere else.</p>
          <p>With an account they’re stored in a private folder only you can reach. You can delete a photo, a board or your whole account at any time.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">AI suggestions</h2>
          <p>When a cloud AI service is connected, DreamCanvas asks before sending anything and sends only small copies, not your originals. Free tiers of AI services can use submitted content to improve their products, and the app tells you when that applies.</p>
          <p>You can always skip suggestions and build a board by hand. The AI is told not to identify people or guess personal traits, and what it suggests is yours to change.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">Bundled art</h2>
          <p>All sample artwork and stickers are original to DreamCanvas and drawn from code, so they’re safe to use in your wallpapers. Icons are from Lucide (ISC license).</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-2xl font-bold">Open-license images</h2>
          <p>Image search uses Openverse and accepts only CC0 and public-domain marked images. Each image keeps its creator, license and source, which you’ll find under Credits in the editor. Openverse is a search index, not a guarantee of rights, so check the source if you plan to use a wallpaper commercially.</p>
        </section>
      </div>
    </PageShell>
  );
}
