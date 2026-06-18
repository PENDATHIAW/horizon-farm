export default function OriginBadge({ className = "", variant = "light" }) {
  const text = variant === "light" ? "text-cream/80" : "text-earth-soft"
  const border = variant === "light" ? "border-cream/20" : "border-cream-dark"

  return (
    <div className={`inline-flex items-center gap-3 rounded-full border ${border} px-4 py-2 ${className}`}>
      <span className="text-xl" aria-hidden="true">
        🐂
      </span>
      <div className={`text-left text-[0.65rem] font-semibold uppercase leading-tight tracking-wider ${text}`}>
        <span className="block">Powered by purified beef tallow</span>
        <span className="block opacity-80">Fabriqué au Sénégal</span>
      </div>
    </div>
  )
}
