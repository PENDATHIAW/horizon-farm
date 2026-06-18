export default function BrandLogo({ className = "", showTagline = false, variant = "dark" }) {
  const color = variant === "light" ? "text-cream" : "text-earth"

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className={`font-display text-5xl font-bold leading-none tracking-tight ${color}`}>
        TG
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold uppercase tracking-[0.12em] sm:text-3xl ${color}`}>
        Tallow & Go
      </div>
      {showTagline ? (
        <>
          <p className={`mt-2 text-sm font-medium ${variant === "light" ? "text-cream/85" : "text-earth-soft"}`}>
            Nourrir • Clarifier • Rayonner
          </p>
          <p className={`text-xs ${variant === "light" ? "text-cream/65" : "text-earth-soft/80"}`}>
            Nourish • Clarify • Glow
          </p>
        </>
      ) : null}
    </div>
  )
}
