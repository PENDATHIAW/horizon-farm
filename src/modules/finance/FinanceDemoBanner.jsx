import { Presentation } from 'lucide-react';

export default function FinanceDemoBanner({ demo = null }) {
  if (!demo?.enabled) return null;

  return (
    <section className="rounded-2xl border border-line bg-neutral-bg px-4 py-3 text-sm text-neutral">
      <div className="flex items-start gap-2">
        <Presentation size={18} className="shrink-0 mt-1" />
        <div>
          <p className="font-semibold text-earth">{demo.label}</p>
          <p className="mt-1 text-neutral">{demo.message}</p>
          {demo.presentationTips?.length ? (
            <ul className="mt-2 list-disc pl-4 text-xs text-neutral">
              {demo.presentationTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
