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

const defaultPoster = "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80";

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

  const homePage = useMemo(() => pages.find((page) => page.slug === "home"), [pages]);
  const selectedPage = useMemo(() => pages.find((page) => Number(page.id) === Number(pageId)), [pages, pageId]);
  const isVideoEditor = sectionKey === "video_walkthrough";

  const orderedSections = useMemo(() => {
    return [...sections].sort((a, b) => {
      if (a.page_slug !== b.page_slug) return a.page_slug.localeCompare(b.page_slug);
      return Number(a.display_order || 0) - Number(b.display_order || 0);
    });
  }, [sections]);

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orderedSections.filter((section) => {
      const matchesPage = pageFilter === "all" || section.page_slug === pageFilter;
      const matchesSearch = !query || section.title?.toLowerCase().includes(query) || section.section_key?.toLowerCase().includes(query) || section.page_title?.toLowerCase().includes(query);
      return matchesPage && matchesSearch;
    });
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
    try {
      setLoading(true);
      await Promise.all([loadSections(), loadPages()]);
    } catch (error) {
      console.error("Sections load error:", error);
      toast.error("Failed to load CMS sections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setPageId(pages[0]?.id || 1);
    setSectionKey("");
    setTitle("");
    setSubtitle("");
    setContent("");
    setImageUrl("");
    setButtonText("");
    setButtonLink("");
    setDisplayOrder(0);
    setIsActive(1);
  };

  const openCreateDrawer = () => { resetForm(); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); resetForm(); };

  const startEdit = (section: Section) => {
    setEditingId(section.id);
    setPageId(section.page_id);
    setSectionKey(section.section_key || "");
    setTitle(section.title || "");
    setSubtitle(section.subtitle || "");
    setContent(section.content || "");
    setImageUrl(section.image_url || "");
    setButtonText(section.button_text || "");
    setButtonLink(section.button_link || "");
    setDisplayOrder(section.display_order || 0);
    setIsActive(section.is_active ? 1 : 0);
    setDrawerOpen(true);
  };

  const useVideoTemplate = () => {
    setEditingId(null);
    setPageId(homePage?.id || pages[0]?.id || 1);
    setSectionKey("video_walkthrough");
    setTitle("Video walkthrough");
    setSubtitle("Show the employee journey in seconds.");
    setContent("Use this section for the final promo video, a Loom walkthrough, or a short demo showing how employees enter their employer portal and book next steps.");
    setImageUrl(defaultPoster);
    setButtonText("Watch demo");
    setButtonLink("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4");
    setDisplayOrder(3);
    setIsActive(1);
    setDrawerOpen(true);
  };

  const saveSection = async (section: Section, orderOverride?: number) => {
    const response = await fetch(`${API_BASE_URL}/sections/${section.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: section.page_id,
        section_key: section.section_key,
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        image_url: section.image_url,
        button_text: section.button_text,
        button_link: section.button_link,
        display_order: orderOverride ?? section.display_order,
        is_active: section.is_active,
      }),
    });

    if (!response.ok) throw new Error(`Failed to update section ${section.id}`);
  };

  const handleDropOrder = async (targetSection: Section) => {
    if (!draggedSectionId || draggedSectionId === targetSection.id) return;

    if (!canDragOrder) {
      toast.warning("Select one page and clear search before drag/drop ordering.");
      setDraggedSectionId(null);
      return;
    }

    const dragged = sections.find((section) => section.id === draggedSectionId);
    if (!dragged || dragged.page_id !== targetSection.page_id) {
      toast.warning("Sections can only be reordered inside the same page.");
      setDraggedSectionId(null);
      return;
    }

    const pageSections = sections
      .filter((section) => section.page_id === targetSection.page_id)
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));

    const fromIndex = pageSections.findIndex((section) => section.id === draggedSectionId);
    const toIndex = pageSections.findIndex((section) => section.id === targetSection.id);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...pageSections];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const optimistic = sections.map((section) => {
      const index = reordered.findIndex((item) => item.id === section.id);
      return index >= 0 ? { ...section, display_order: index + 1 } : section;
    });

    setSections(optimistic);
    setDraggedSectionId(null);

    try {
      setSavingOrder(true);
      await Promise.all(reordered.map((section, index) => saveSection(section, index + 1)));
      toast.success("Section order saved.");
      await loadSections();
    } catch (error) {
      console.error("Section reorder failed:", error);
      toast.error("Could not save section order.");
      await loadSections();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionKey.trim()) { toast.warning("Section key is required."); return; }

    const url = editingId ? `${API_BASE_URL}/sections/${editingId}` : `${API_BASE_URL}/sections`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, section_key: sectionKey.trim(), title, subtitle, content, image_url: imageUrl, button_text: buttonText, button_link: buttonLink, display_order: displayOrder, is_active: isActive }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(data.message || "Section save failed."); return; }
      toast.success(editingId ? "Section updated successfully." : "Section created successfully.");
      closeDrawer();
      loadSections();
    } catch (error) {
      console.error("Section save error:", error);
      toast.error("Could not save section. Please try again.");
    }
  };

  const handleDelete = async (section: Section) => {
    const confirmDelete = confirm(`Delete section: ${section.title || section.section_key}?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/sections/${section.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(data.message || "Delete failed."); return; }
      toast.success("Section deleted.");
      loadSections();
    } catch (error) {
      console.error("Section delete error:", error);
      toast.error("Could not delete section.");
    }
  };

  return (
    <AdminLayout title="Manage Sections">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">CMS module editor</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Professional section builder</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">Edit modules and drag/drop sections inside a selected page to update display_order.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={openCreateDrawer} className="rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">Add Section</button>
            <button type="button" onClick={useVideoTemplate} className="rounded-full border border-white/30 px-4 py-2 text-xs font-black text-white hover:bg-white/10">Video Template</button>
            <Link to="/admin/cards" className="rounded-full border border-white/30 px-4 py-2 text-xs font-black text-white hover:bg-white/10">Edit Bullets/Cards</Link>
          </div>
        </div>

        <div className="premium-card">
          <p className="eyebrow">CMS health</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-3"><p className="text-2xl font-black text-violet-700">{sections.length}</p><p className="text-[11px] font-bold text-slate-500">Sections</p></div>
            <div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{pages.length}</p><p className="text-[11px] font-bold text-slate-500">Pages</p></div>
            <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-700">{savingOrder ? "..." : "Drag"}</p><p className="text-[11px] font-bold text-slate-500">Ordering</p></div>
          </div>
        </div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
            <input className="form-field" placeholder="Search sections by key, page, or title..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={pageFilter} onChange={(e) => setPageFilter(e.target.value)}>
              <option value="all">All pages</option>
              {pages.map((page) => <option key={page.id} value={page.slug}>{page.title}</option>)}
            </select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Section</button>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">Drag/drop ordering is enabled only when one page is selected and search is empty.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Move</th><th className="px-4 py-3">Page</th><th className="px-4 py-3">Key</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {filteredSections.map((section) => (
                <tr key={section.id} draggable={canDragOrder && !savingOrder} onDragStart={() => setDraggedSectionId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDropOrder(section)} className={`border-b last:border-0 hover:bg-violet-50/40 ${draggedSectionId === section.id ? "bg-blue-50 opacity-70" : ""}`}>
                  <td className="px-4 py-3"><span className={`cursor-grab rounded-xl px-3 py-2 text-xs font-black ${canDragOrder ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"}`}>⋮⋮</span></td>
                  <td className="px-4 py-3 font-bold text-slate-700">{section.page_title}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${section.section_key === "video_walkthrough" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>{section.section_key}</span></td>
                  <td className="px-4 py-3"><p className="font-black text-slate-950">{section.title || "Untitled section"}</p><p className="line-clamp-1 max-w-md text-xs text-slate-500">{section.subtitle || section.content || "No subtitle"}</p></td>
                  <td className="px-4 py-3 font-bold text-slate-600">{section.display_order}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${section.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{section.is_active ? "Active" : "Disabled"}</span></td>
                  <td className="px-4 py-3 text-right"><details className="relative inline-block text-left"><summary className="list-none rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">⋯</summary><div className="absolute right-0 z-20 mt-2 w-36 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl"><button type="button" onClick={() => startEdit(section)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">Edit</button><button type="button" onClick={() => handleDelete(section)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">Delete</button></div></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredSections.length === 0 && <div className="p-8 text-center"><p className="text-lg font-black text-slate-700">No sections found</p><p className="mt-1 text-sm text-slate-500">Try clearing filters or create a new section.</p></div>}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[86vw] xl:w-[980px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">CMS drawer editor</p><h2 className="text-2xl font-black">{editingId ? "Edit Section" : "Create Section"}</h2></div><button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button></div>
            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.86fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Page</span><select className="form-field" value={pageId} onChange={(e) => setPageId(Number(e.target.value))}>{pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Section Key</span><input className="form-field" placeholder="hero, resources, video_walkthrough" value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} /></label></div>
                {isVideoEditor && <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-4 text-sm text-slate-700"><p className="font-black text-violet-700">Video mapping</p><p className="mt-1">Title = label, Subtitle = big heading, Content = paragraph, Image URL = poster, Button Link = video/embed link.</p></div>}
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Title / Label</span><input className="form-field" placeholder={isVideoEditor ? "Video walkthrough" : "Section Title"} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Subtitle / Heading</span><input className="form-field" placeholder={isVideoEditor ? "Show the employee journey in seconds." : "Subtitle"} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Content</span><textarea className="form-field min-h-28" placeholder="Section description" value={content} onChange={(e) => setContent(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Image / Poster URL</span><input className="form-field" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></label>
                <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Button Text</span><input className="form-field" placeholder="Open / Watch demo" value={buttonText} onChange={(e) => setButtonText(e.target.value)} /></label><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Button / Video Link</span><input className="form-field" placeholder="/login or https://..." value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} /></label></div>
                <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Display Order</span><input className="form-field" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></label><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label></div>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><button className="btn-primary">{editingId ? "Update Section" : "Create Section"}</button><button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button></div>
              </form>
              <section className="border-l border-slate-200 bg-white p-5"><p className="eyebrow">Live preview</p><div className="mt-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-xl">{imageUrl && <img src={imageUrl} alt="Section preview" className="h-48 w-full object-cover opacity-80" />}<div className="p-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200">{title || "Section label"}</p><h3 className="mt-2 text-3xl font-black tracking-tight">{subtitle || "Section heading preview"}</h3><p className="mt-3 text-sm leading-relaxed text-violet-100">{content || "Section content preview will appear here as you type."}</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">{selectedPage?.title || "Page"}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">{sectionKey || "section_key"}</span>{buttonLink && <span className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-black text-slate-950">Link ready</span>}</div></div></div>{isVideoEditor && <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-slate-700"><p className="font-black text-violet-700">Video URL</p><p className="mt-1 break-all">{buttonLink || "Paste MP4, WebM, YouTube, Vimeo, or Loom link."}</p></div>}</section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageSections;
