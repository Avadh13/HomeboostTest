type DynamicSectionProps = {
  title?: string | null;
  subtitle?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  align?: "left" | "center";
};

function DynamicSection({ title, subtitle, content, imageUrl, align = "left" }: DynamicSectionProps) {
  return (
    <section className="px-6 py-16">
      <div className={`mx-auto max-w-6xl ${align === "center" ? "text-center" : ""}`}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            {subtitle && <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">{subtitle}</p>}
            {title && <h2 className="mt-3 text-4xl font-black text-slate-950">{title}</h2>}
            {content && <p className="mt-4 leading-relaxed text-slate-600">{content}</p>}
          </div>
          {imageUrl && <img src={imageUrl} alt={title || "Section image"} className="h-80 w-full rounded-3xl object-cover shadow-xl" />}
        </div>
      </div>
    </section>
  );
}

export default DynamicSection;
