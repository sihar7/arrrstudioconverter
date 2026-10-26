import FaceCross from "./FaceCross";

/** Keadaan kosong preview: diagram salib 6 sisi + penjelasan singkat */
export default function PreviewEmpty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex max-w-md flex-col items-center px-6">
      <div className="w-[min(240px,60%)] opacity-90">
        <FaceCross
          renderTile={(_face, prop) => (
            <span className="absolute inset-0 grid place-items-center rounded-[6px] border border-white/12 bg-white/[0.04] text-[10.5px] font-semibold text-white/55 sm:text-[11.5px]">
              {prop.replace("Skybox", "")}
            </span>
          )}
        />
      </div>
      <p className="mt-6 font-display text-[17px] font-bold tracking-[-0.02em] sm:text-[19px]">{title}</p>
      <p className="mt-2 hidden text-[13.5px] leading-relaxed text-white/60 sm:block">{sub}</p>
    </div>
  );
}
