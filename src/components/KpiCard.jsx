import { ArrowDown, ArrowUp } from 'lucide-react';

export default function KpiCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#b6975f] transition-all">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {Icon ? <Icon size={18} /> : null}
        </div>
        {trend !== undefined ? (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-2xl font-bold text-[#2f2415]">{value}</div>
        <div className="text-xs text-[#8a7456] mt-1">{label}</div>
        {sub ? <div className="text-xs text-[#b39b78] mt-1">{sub}</div> : null}
      </div>
    </div>
  );
}


