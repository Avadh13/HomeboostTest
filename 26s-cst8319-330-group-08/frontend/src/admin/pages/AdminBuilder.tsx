import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";

type BuilderBlock = {
  id: string;
  label: string;
  description: string;
  status: string;
  route: string;
  group: "CMS" | "Business" | "Operations";
  icon: string;
};

function AdminBuilder() {
  const [blocks, setBlocks] = useState<BuilderBlock[]>([
    {
      id: "pages",
      label: "Pages",
      description: "Edit main website pages such as Home, Pricing, and employee portal copy.",
      status: "Content",
      route: "/admin/pages",
      group: "CMS",
      icon: "◫",
    },
    {
      id: "sections",
      label: "Sections",
      description: "Change hero, video walkthrough, feature, resource, and call-to-action sections.",
      status: "Layout",
      route: "/admin/sections",
      group: "CMS",
      icon: "▥",
    },
    {
      id: "cards",
      label: "Cards",
      description: "Update reusable cards, video bullets, and section content blocks.",
      status: "Components",
      route: "/admin/cards",
      group: "CMS",
      icon: "▦",
    },
    {
      id: "partnerships",
      label: "Employer Partnerships",
      description: "Create employer-branded portals and assign each company to an HBT team.",
      status: "Business Flow",
      route: "/admin/partnerships",
      group: "Business",
      icon: "◇",
    },
    {
      id: "hbts",
      label: "Home Buying Teams",
      description: "Create and manage HBT team profiles and admin accounts.",
      status: "Teams",
      route: "/admin/hbts",
      group: "Business",
      icon: "◈",
    },
    {
      id: "resources",
      label: "Resources",
      description: "Manage employee education content, guides, links, and service material.",
      status: "Library",
      route: "/admin/resources",
      group: "CMS",
      icon: "▤",
    },
    {
      id: "quizzes",
      label: "Quizzes",
      description: "Build readiness quizzes and review employee submissions.",
      status: "Forms",
      route: "/admin/quizzes",
      group: "Operations",
      icon: "✦",
    },
    {
      id: "appointments",
      label: "Appointments",
      description: "Monitor employee booking requests across partnerships and HBT teams.",
      status: "Scheduling",
      route: "/admin/appointments",
      group: "Operations",
      icon: "◷",
    },
    {
      id: "messages",
      label: "Contact Messages",
      description: "Review website contact messages and support requests.",
      status: "Inbox",
      route: "/admin/contact-messages",
      group: "Operations",
      icon: "✉",
    },
  ]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | BuilderBlock["group"]>("all");

  const visibleBlocks = useMemo(() => {
    return filter === "all" ? blocks : blocks.filter((block) => block.group === filter);
  }, [blocks, filter]);

  const selectedSummary = useMemo(
    () => blocks.map((block, index) => `${index + 1}. ${block.label}`).join(" → "),
    [blocks]
  );

  const groupStats = useMemo(() => {
    return {
      CMS: blocks.filter((block) => block.group === "CMS").length,
      Business: blocks.filter((block) => block.group === "Business").length,
      Operations: blocks.filter((block) => block.group === "Operations").length,
    };
  }, [blocks]);

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
      <div className="space-y-5">
        <section className="theme-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">Builder Mode</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Website Control Center</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100 md:text-base">
                Use this screen like a lightweight WordPress-style command center. Drag modules to plan the admin workflow, then open each module to edit live website content, employer portals, quizzes, resources, and operations.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white/10 p-3 backdrop-blur">
              <div><p className="text-2xl font-black">{groupStats.CMS}</p><p className="text-[11px] font-bold uppercase text-violet-100">CMS</p></div>
              <div><p className="text-2xl font-black">{groupStats.Business}</p><p className="text-[11px] font-bold uppercase text-violet-100">Business</p></div>
              <div><p className="text-2xl font-black">{groupStats.Operations}</p><p className="text-[11px] font-bold uppercase text-violet-100">Ops</p></div>
            </div>
          </div>
        </section>

        <section className="premium-card">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Workflow order</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Admin editing map</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">This order is a planning aid only. It does not change database order.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "CMS", "Business", "Operations"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-black ${filter === item ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            Current admin workflow: {selectedSummary}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {visibleBlocks.map((block) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => setDraggedId(block.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(block.id)}
              className={`group cursor-grab overflow-hidden rounded-[1.75rem] border bg-white shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl ${draggedId === block.id ? "border-blue-500 opacity-70" : "border-slate-100"}`}
            >
              <div className="h-1.5 bg-gradient-to-r from-blue-600 to-violet-600" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-xl font-black text-violet-700 transition group-hover:scale-110">{block.icon}</div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{block.status}</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">{block.label}</h3>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Drag</span>
                </div>
                <p className="mt-4 min-h-[70px] text-sm leading-relaxed text-slate-600">{block.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{block.group}</span>
                  <Link to={block.route} className="btn-dark">Open editor</Link>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="premium-card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Client readiness</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">Editing coverage</h3>
            </div>
            <Link to="/admin/partnerships" className="btn-primary">Create Partnership</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              "Create HBT teams",
              "Create employer partnerships",
              "Manage employees and roles",
              "Upload/revoke CSV enrollment",
              "Edit pages and sections",
              "Edit video walkthrough content",
              "Manage quizzes and submissions",
              "Monitor appointment requests",
              "Review contact messages",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700">
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
