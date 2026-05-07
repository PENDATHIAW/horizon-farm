export default function HomePage({ Module, moduleProps }) {
  if (!Module) {
    return <div className="text-[#7d6a4a]">Module introuvable.</div>;
  }

  return <Module {...moduleProps} />;
}


