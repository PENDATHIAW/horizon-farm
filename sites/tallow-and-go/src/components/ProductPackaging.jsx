const shapes = {
  "round-disc":
    "relative flex aspect-square max-w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-[#efe6d8] to-[#d9c7ad] shadow-[inset_0_2px_8px_rgba(61,41,20,0.12)]",
  "square-flat-lid": "relative h-24 w-20 rounded-xl bg-gradient-to-br from-[#f3ece2] to-[#dfd0bc] shadow-[0_8px_20px_rgba(61,41,20,0.08)]",
  "tall-disc-cap": "relative h-32 w-14 rounded-2xl bg-gradient-to-b from-[#f3ece2] to-[#e5d6c2]",
  "square-disc-cap": "relative h-20 w-20 rounded-2xl bg-gradient-to-br from-[#f3ece2] to-[#dfd0bc]",
  egg: "h-20 w-12 rounded-[50%] bg-gradient-to-br from-[#f3ece2] to-[#dfd0bc]",
}

export default function ProductPackaging({ packaging, name }) {
  const shapeClass = shapes[packaging] || shapes["square-flat-lid"]

  return (
    <div className="relative flex h-[200px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(232,207,192,0.35),transparent_70%)]">
      {packaging === "round-disc" ? (
        <div className={shapeClass}>
          <span className="font-display text-lg font-bold text-earth/70">TG</span>
        </div>
      ) : null}

      {packaging === "square-flat-lid" ? (
        <div className="relative">
          <div className={`${shapeClass} absolute -top-2 left-1/2 h-3 w-[4.5rem] -translate-x-1/2 rounded-sm bg-[#ebe3d6]`} />
          <div className={shapeClass} role="img" aria-label={`Packaging ${name}`} />
        </div>
      ) : null}

      {packaging === "tall-disc-cap" ? (
        <div className="relative">
          <div className="absolute -top-3 left-1/2 h-4 w-10 -translate-x-1/2 rounded-full bg-[#ebe3d6]" />
          <div className={shapeClass} role="img" aria-label={`Packaging ${name}`} />
        </div>
      ) : null}

      {packaging === "square-disc-cap" ? (
        <div className="relative">
          <div className="absolute -top-2.5 left-1/2 h-4 w-12 -translate-x-1/2 rounded-full bg-[#ebe3d6]" />
          <div className={shapeClass} role="img" aria-label={`Packaging ${name}`} />
        </div>
      ) : null}

      {packaging === "egg" ? (
        <div className={shapeClass} role="img" aria-label={`Packaging ${name}`} />
      ) : null}
    </div>
  )
}
