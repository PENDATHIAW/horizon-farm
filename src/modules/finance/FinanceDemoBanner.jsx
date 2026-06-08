import { Presentation } from 'lucide-react';

export default function FinanceDemoBanner({ demo = null }) {
  if (!demo?.enabled) return null;

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <div className="flex items-start gap-2">
        <Presentation size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-black text-[#2f2415]">{demo.label}</p>
          <p className="mt-1 text-sky-800">{demo.message}</p>
          {demo.presentationTips?.length ? (
            <ul className="mt-2 list-disc pl-4 text-xs text-sky-800">
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
