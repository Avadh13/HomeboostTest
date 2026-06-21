import { useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";

type BuilderBlock = {
  id: string;
  label: string;
  description: string;
  status: string;
  route: string;
};

function AdminBuilder() {
  const [blocks, setBlocks] = useState<BuilderBlock[]>([
    {
      id: "pages",
      label: "Pages",
      description: "Edit main website pages such as Home, Pricing, and employee portal copy.",
      status: "Content",
      route: "/admin/pages",
    },
    {
      id: "sections",
      label: "Sections",
      description: "Change hero, feature, resource, and call-to-action sections.",
      status: "Layout",
      route: "/admin/sections",
    },
    {
      id: "cards",
      label: "Cards",
      description: "Update reusable cards shown on page sections.",
      status: "Components",
      route: "/admin/cards",
    },
    {
      id: "partnerships",
      label: "Employer Partnerships",
      description: "Create employer-branded portals and assign each company to an HBT team.",
      status: "Business Flow",
      route: "/admin/partnerships",
    },
    {
      id: "resources",
      label: "Resources",
      description: "Manage employee education content, guides, links, and service material.",
      status: "Library",
      route: "/admin/resources",
    },
    {
      id: "quizzes",
      label: "Quizzes",
      description: "Build readiness quizzes and review employee submissions.",
      status: "Forms",
      route: "/admin/quizzes",
    },
  ]);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => blocks.map((block, index) => `${index + 1}. ${block.label}`).join(" → "),
    [blocks]
  );

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = blocks.findIndex((block) => block.id === draggedId);
    const targetIndex = blocks.findIndex((block) => block.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updated = [...blocks];
    const [draggedBlock] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedBlock);
    setBlocks(updated);
    setDraggedId(null);
  };

  return (
    <AdminLayout title="Admin Builder">
      <div className="space-y-8">
        <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-700">
            Builder Mode
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">
            Website control center for client changes
          </h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Use this screen like a lightweight WordPress-style editor. Drag modules to plan the
            admin workflow, then open each module to edit live website content, employer pages,
            quizzes, resources, and partnership data.
          </p>
          <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600">
            Current admin workflow: {selectedSummary}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => setDraggedId(block.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(block.id)}
              className={`cursor-grab rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                draggedId === block.id ? "border-blue-500 opacity-70" : "border-slate-100"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                    {block.status}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">{block.label}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  Drag
                </span>
              </div>
              <p className="mt-4 leading-relaxed text-slate-600">{block.description}</p>
              <a
                href={block.route}
                className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Open editor
              </a>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">Client-ready editing coverage</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              "Create HBT teams",
              "Create employer partnerships",
              "Manage employees and roles",
              "Upload/revoke CSV enrollment",
              "Edit pages and sections",
              "Manage quizzes and submissions",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4 font-semibold text-slate-700">
                ✓ {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminBuilder;
