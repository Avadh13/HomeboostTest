import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type Section = {
  id: number;
  page_id: number;
  page_title: string;
  page_slug: string;
  section_key: string;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: number;
};

type Page = { id: number; slug: string; title: string };

function ManageSections() {
  const toast = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState("home");
  const [pageId, setPageId] = useState(1);
  const [sectionKey, setSectionKey] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const jsonHeaders = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const homePage = useMemo(() => pages.find((page) => page.slug === "home"), [pages]);
  const selectedPage = useMemo(() => pages.find((page) => Number(page.id) === Number(pageId)), [pages, pageId]);
  const isVideoEditor = sectionKey === "video_walkthrough";

  const orderedSections = useMemo(() => [...sections].sort((a, b) => a.page_slug !== b.page_slug ? a.page_slug.localeCompare(b.page_slug) : Number(a.display_order || 0) - Number(b.display_order || 0)), [sections]);
  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedSections.filter((section) => (pageFilter === "all" || section.page_slug === pageFilter) && (!query || [section.title, section.section_key, section.page_title].filter(Boolean).join(" ").toLowerCase().includes(query)));
  }, [orderedSections, pageFilter, search]);
  const canDragOrder = pageFilter !== "all" && search.trim().length === 0;

  const loadSections = async () => {
    const response = await fetch(`${API_BASE_URL}/sections`);
    const data = await response.json();
    setSections(Array.isArray(data) ? data : []);
  };

  const loadPages = async () => {
    const response = await fetch(`${API_BASE_URL}/pages`);
    const data = await response.json();
    const safePages = Array.isArray(data) ? data : [];
    setPages(safePages);
    if (safePages.length > 0) {
      const home = safePages.find((page: Page) => page.slug === "home") || safePages[0];
      setPageId(home.id);
      setPageFilter(home.slug || "all");
    }
  };

  const loadData = async () => {
    try { setLoading(true); await Promise.all([loadSections(), loadPages()]); }
    catch (error) { console.error("Sections load error:", error); toast.error("Failed to load CMS sections."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null); setPageId(pages[0]?.id || 1); setSectionKey(""); setTitle(""); setSubtitle(""); setContent(""); setImageUrl(""); setButtonText(""); setButtonLink(""); setDisplayOrder(0); setIsActive(1);
  };
  const openCreateDrawer = () => { resetForm(); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); resetForm(); };
  const startEdit = (section: Section) => {
    setEditingId(section.id); setPageId(section.page_id); setSectionKey(section.section_key || ""); setTitle(section.title || ""); setSubtitle(section.subtitle || ""); setContent(section.content || ""); setImageUrl(section.image_url || ""); setButtonText(section.button_text || ""); setButtonLink(section.button_link || ""); setDisplayOrder(section.display_order || 0); setIsActive(section.is_active ? 1 : 0); setDrawerOpen(true);
  };

  const useVideoTemplate = () => {
    setEditingId(null);
    setPageId(homePage?.id || pages[0]?.id || 1);
    setSectionKey("video_walkthrough");
    setTitle("Program video");
    setSubtitle("Employee Benefit Program overview");
    setContent("Add the approved Employee Benefit Program video and poster image before publishing this section.");
    setImageUrl("");
    setButtonText("Watch video");
    setButtonLink("");
    setDisplayOrder(3);
    setIsActive(0);
    setDrawerOpen(true);
  };

  const saveSection = async (section: Section, orderOverride?: number) => {
    const response = await fetch(`${API_BASE_URL}/sections/${section.id}`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ page_id: section.page_id, section_key: section.section_key, title: section.title, subtitle: section.subtitle, content: section.content, image_url: section.image_url, button_text: section.button_text, button_link: section.button_link, display_order: orderOverride ?? section.display_order, is_active: section.is_active }),
    });
    if (!response.ok) throw new Error(`Failed to update section ${section.id}`);
  };

  const handleDropOrder = async (targetSection: Section) => {
    if (!draggedSectionId || draggedSectionId === targetSection.id) return;
    if (!canDragOrder) { toast.warning("Select one page and clear search before drag/drop ordering."); setDraggedSectionId(null); return; }
    const dragged = sections.find((section) => section.id === draggedSectionId);
    if (!dragged || dragged.page_id !== targetSection.page_id) { toast.warning("Sections can only be reordered inside the same page."); setDraggedSectionId(null); return; }
    const pageSections = sections.filter((section) => section.page_id === targetSection.page_id).sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
    const fromIndex = pageSections.findIndex((section) => section.id === draggedSectionId);
    const toIndex = pageSections.findIndex((section) => section.id === targetSection.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...pageSections];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setSections(sections.map((section) => {
      const index = reordered.findIndex((item) => item.id === section.id);
      return index >= 0 ? { ...section, display_order: index + 1 } : section;
    }));
    setDraggedSectionId(null);
    try { setSavingOrder(true); await Promise.all(reordered.map((section, index) => saveSection(section, index + 1))); toast.success("Section order saved."); await loadSections(); }
    catch { toast.error("Could not save section order."); await loadSections(); }
    finally { setSavingOrder(false); }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sectionKey.trim()) { toast.warning("Section key is required."); return; }
    if (isVideoEditor && isActive === 1 && !buttonLink.trim()) { toast.warning("Add the approved video URL before activating this video section."); return; }
    try {
      const response = await fetch(editingId ? `${API_BASE_URL}/sections/${editingId}` : `${API_BASE_URL}/sections`, {
        method: editingId ? "PUT" : "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ page_id: pageId, section_key: sectionKey.trim(), title, subtitle, content, image_url: imageUrl, button_text: buttonText, button_link: buttonLink, display_order: displayOrder, is_active: isActive }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(data.message || "Section save failed."); return; }
      toast.success(editingId ? "Section updated successfully." : "Section created successfully."); closeDrawer(); loadSections();
    } catch { toast.error("Could not save section. Please try again."); }
  };

  const handleDelete = async (section: Section) => {
    if (!confirm(`Delete section: ${section.title || section.section_key}?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/sections/${section.id}`, { method: "DELETE", headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(data.message || "Delete failed."); return; }
      toast.success("Section deleted."); loadSections();
    } catch { toast.error("Could not delete section."); }
  };

  return (
    <AdminLayout title="Manage Sections">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="eyebrow">CMS module editor</p><h2 className="mt-2 text-2xl font-black tracking-tight">Production section builder</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">Manage published section content and ordering. New video sections start disabled until an approved media URL is supplied.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={openCreateDrawer} className="btn-primary">Add Section</button><button type="button" onClick={useVideoTemplate} className="btn-secondary">Video Section</button><Link to="/admin/cards" className="btn-secondary">Edit Cards</Link></div></div>
        <div className="premium-card"><p className="eyebrow">CMS status</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{sections.length}</p><p className="text-[11px] font-bold text-slate-500">Sections</p></div><div className="rounded-2xl bg-indigo-50 p-3"><p className="text-2xl font-black text-indigo-700">{pages.length}</p><p className="text-[11px] font-bold text-slate-500">Pages</p></div><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-700">{savingOrder ? "..." : "Ready"}</p><p className="text-[11px] font-bold text-slate-500">Ordering</p></div></div></div>
      </div>

      <div className="premium-card overflow-hidden p-0"><div className="border-b border-slate-100 p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center"><input className="form-field" placeholder="Search sections..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="form-field" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)}><option value="all">All pages</option>{pages.map((page) => <option key={page.id} value={page.slug}>{page.title}</option>)}</select><button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Section</button></div></div><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Move</th><th className="px-4 py-3">Page</th><th className="px-4 py-3">Key</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filteredSections.map((section) => <tr key={section.id} draggable={canDragOrder && !savingOrder} onDragStart={() => setDraggedSectionId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDropOrder(section)} className="border-b last:border-0 hover:bg-blue-50/40"><td className="px-4 py-3">⋮⋮</td><td className="px-4 py-3 font-bold">{section.page_title}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{section.section_key}</span></td><td className="px-4 py-3"><p className="font-black">{section.title || "Untitled section"}</p><p className="line-clamp-1 max-w-md text-xs text-slate-500">{section.subtitle || section.content || "No subtitle"}</p></td><td className="px-4 py-3">{section.display_order}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${section.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{section.is_active ? "Active" : "Disabled"}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => startEdit(section)} className="btn-secondary mr-2">Edit</button><button type="button" onClick={() => handleDelete(section)} className="btn-danger">Delete</button></td></tr>)}</tbody></table></div>{!loading && filteredSections.length === 0 && <div className="p-8 text-center text-slate-500">No sections found.</div>}</div>

      {drawerOpen && <div className="fixed inset-0 z-[80]"><button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" /><aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl md:w-[86vw] xl:w-[980px]"><div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">CMS editor</p><h2 className="text-2xl font-black">{editingId ? "Edit Section" : "Create Section"}</h2></div><button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">Close</button></div><div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.86fr]"><form onSubmit={handleSubmit} className="space-y-4 p-5"><div className="grid gap-4 md:grid-cols-2"><select className="form-field" value={pageId} onChange={(e) => setPageId(Number(e.target.value))}>{pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select><input className="form-field" placeholder="section_key" value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} /></div>{isVideoEditor && <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-black">Approved media required</p><p className="mt-1">Supply the approved poster and video/embed URL before setting this section Active.</p></div>}<input className="form-field" placeholder="Section title" value={title} onChange={(e) => setTitle(e.target.value)} /><input className="form-field" placeholder="Section heading" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /><textarea className="form-field min-h-28" placeholder="Section content" value={content} onChange={(e) => setContent(e.target.value)} /><input className="form-field" placeholder="Approved image/poster URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /><div className="grid gap-4 md:grid-cols-2"><input className="form-field" placeholder="Button text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} /><input className="form-field" placeholder="Button or approved media URL" value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} /></div><div className="grid gap-4 md:grid-cols-2"><input className="form-field" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></div><div className="flex gap-3 border-t border-slate-200 pt-4"><button className="btn-primary">{editingId ? "Update Section" : "Create Section"}</button><button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button></div></form><section className="border-l border-slate-200 bg-white p-5"><p className="eyebrow">Preview</p><div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-xl">{imageUrl && <img src={imageUrl} alt="Section preview" className="h-48 w-full object-cover opacity-80" />}<div className="p-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">{title || "No label entered"}</p><h3 className="mt-2 text-3xl font-black tracking-tight">{subtitle || "No heading entered"}</h3><p className="mt-3 text-sm leading-relaxed text-slate-300">{content || "No content entered."}</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">{selectedPage?.title || "Page"}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">{sectionKey || "section_key"}</span></div></div></div></section></div></aside></div>}
    </AdminLayout>
  );
}

export default ManageSections;
