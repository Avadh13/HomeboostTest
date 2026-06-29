import { useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";
import { useToast } from "../../components/ToastProvider";

type Card = {
  id: number;
  section_id: number;
  section_title: string;
  section_key: string;
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: number;
};

type Section = { id: number; title: string; section_key: string };

function ManageCards() {
  const toast = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");

  const [sectionId, setSectionId] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  const selectedSection = useMemo(() => sections.find((section) => Number(section.id) === Number(sectionId)), [sectionId, sections]);

  const orderedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (a.section_id !== b.section_id) return Number(a.section_id) - Number(b.section_id);
      return Number(a.display_order || 0) - Number(b.display_order || 0);
    });
  }, [cards]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedCards.filter((card) => {
      const matchesSection = sectionFilter === "all" || String(card.section_id) === sectionFilter;
      const matchesSearch = !query || card.title?.toLowerCase().includes(query) || card.description?.toLowerCase().includes(query) || card.section_key?.toLowerCase().includes(query) || card.section_title?.toLowerCase().includes(query);
      return matchesSection && matchesSearch;
    });
  }, [orderedCards, search, sectionFilter]);

  const canDragOrder = sectionFilter !== "all" && search.trim().length === 0;

  const loadCards = async () => {
    const response = await fetch(`${API_BASE_URL}/cards`);
    const data = await response.json();
    setCards(Array.isArray(data) ? data : []);
  };

  const loadSections = async () => {
    const response = await fetch(`${API_BASE_URL}/sections`);
    const data = await response.json();
    const safeSections = Array.isArray(data) ? data : [];
    setSections(safeSections);
    if (safeSections.length > 0) {
      setSectionId(safeSections[0].id);
      setSectionFilter(String(safeSections[0].id));
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCards(), loadSections()]);
    } catch (error) {
      console.error("Cards load error:", error);
      toast.error("Failed to load cards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setSectionId(sections[0]?.id || 1);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setButtonText("");
    setButtonLink("");
    setDisplayOrder(0);
    setIsActive(1);
  };

  const openCreateDrawer = () => { resetForm(); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); resetForm(); };

  const startEdit = (card: Card) => {
    setEditingId(card.id);
    setSectionId(card.section_id);
    setTitle(card.title || "");
    setDescription(card.description || "");
    setImageUrl(card.image_url || "");
    setButtonText(card.button_text || "");
    setButtonLink(card.button_link || "");
    setDisplayOrder(card.display_order || 0);
    setIsActive(card.is_active ? 1 : 0);
    setDrawerOpen(true);
  };

  const saveCard = async (card: Card, orderOverride?: number) => {
    const response = await fetch(`${API_BASE_URL}/cards/${card.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section_id: card.section_id,
        title: card.title,
        description: card.description,
        image_url: card.image_url,
        button_text: card.button_text,
        button_link: card.button_link,
        display_order: orderOverride ?? card.display_order,
        is_active: card.is_active,
      }),
    });

    if (!response.ok) throw new Error(`Failed to update card ${card.id}`);
  };

  const handleDropOrder = async (targetCard: Card) => {
    if (!draggedCardId || draggedCardId === targetCard.id) return;

    if (!canDragOrder) {
      toast.warning("Select one section and clear search before drag/drop ordering.");
      setDraggedCardId(null);
      return;
    }

    const dragged = cards.find((card) => card.id === draggedCardId);
    if (!dragged || dragged.section_id !== targetCard.section_id) {
      toast.warning("Cards can only be reordered inside the same section.");
      setDraggedCardId(null);
      return;
    }

    const sectionCards = cards
      .filter((card) => card.section_id === targetCard.section_id)
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));

    const fromIndex = sectionCards.findIndex((card) => card.id === draggedCardId);
    const toIndex = sectionCards.findIndex((card) => card.id === targetCard.id);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...sectionCards];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const optimistic = cards.map((card) => {
      const index = reordered.findIndex((item) => item.id === card.id);
      return index >= 0 ? { ...card, display_order: index + 1 } : card;
    });

    setCards(optimistic);
    setDraggedCardId(null);

    try {
      setSavingOrder(true);
      await Promise.all(reordered.map((card, index) => saveCard(card, index + 1)));
      toast.success("Card order saved.");
      await loadCards();
    } catch (error) {
      console.error("Card reorder failed:", error);
      toast.error("Could not save card order.");
      await loadCards();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.warning("Card title is required."); return; }

    const url = editingId ? `${API_BASE_URL}/cards/${editingId}` : `${API_BASE_URL}/cards`;
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, title, description, image_url: imageUrl, button_text: buttonText, button_link: buttonLink, display_order: displayOrder, is_active: isActive }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(data.message || "Card save failed."); return; }
      toast.success(editingId ? "Card updated successfully." : "Card created successfully.");
      closeDrawer();
      loadCards();
    } catch (error) {
      console.error("Card save error:", error);
      toast.error("Could not save card.");
    }
  };

  const handleDelete = async (card: Card) => {
    const confirmDelete = confirm(`Delete card: ${card.title}?`);
    if (!confirmDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/cards/${card.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(data.message || "Delete failed."); return; }
      toast.success("Card deleted.");
      loadCards();
    } catch (error) {
      console.error("Card delete error:", error);
      toast.error("Could not delete card.");
    }
  };

  return (
    <AdminLayout title="Manage Cards">
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="theme-panel">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">CMS cards</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Reusable section cards and bullet points</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-100">Cards power homepage resource blocks, video bullets, and other CMS content modules. Drag/drop inside one section to save display_order.</p>
          <button type="button" onClick={openCreateDrawer} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-50">Add Card</button>
        </div>
        <div className="premium-card"><p className="eyebrow">Card stats</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-violet-50 p-3"><p className="text-2xl font-black text-violet-700">{cards.length}</p><p className="text-[11px] font-bold text-slate-500">Cards</p></div><div className="rounded-2xl bg-blue-50 p-3"><p className="text-2xl font-black text-blue-700">{sections.length}</p><p className="text-[11px] font-bold text-slate-500">Sections</p></div><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-2xl font-black text-emerald-700">{savingOrder ? "..." : "Drag"}</p><p className="text-[11px] font-bold text-slate-500">Order</p></div></div></div>
      </div>

      <div className="premium-card overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-center">
            <input className="form-field" placeholder="Search cards..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-field" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}><option value="all">All sections</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.title} ({section.section_key})</option>)}</select>
            <button type="button" onClick={openCreateDrawer} className="btn-primary whitespace-nowrap">Add Card</button>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">Drag/drop ordering is enabled only when one section is selected and search is empty.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Move</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Card</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id} draggable={canDragOrder && !savingOrder} onDragStart={() => setDraggedCardId(card.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDropOrder(card)} className={`border-b last:border-0 hover:bg-violet-50/40 ${draggedCardId === card.id ? "bg-blue-50 opacity-70" : ""}`}>
                  <td className="px-4 py-3"><span className={`cursor-grab rounded-xl px-3 py-2 text-xs font-black ${canDragOrder ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"}`}>⋮⋮</span></td>
                  <td className="px-4 py-3"><p className="font-bold text-slate-700">{card.section_title}</p><p className="text-xs font-bold text-violet-500">{card.section_key}</p></td>
                  <td className="px-4 py-3"><p className="font-black text-slate-950">{card.title}</p><p className="line-clamp-1 max-w-md text-xs text-slate-500">{card.description || "No description"}</p></td>
                  <td className="px-4 py-3 font-bold text-slate-600">{card.display_order}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${card.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{card.is_active ? "Active" : "Disabled"}</span></td>
                  <td className="px-4 py-3 text-right"><details className="relative inline-block text-left"><summary className="list-none rounded-full bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">⋯</summary><div className="absolute right-0 z-20 mt-2 w-36 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl"><button type="button" onClick={() => startEdit(card)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700">Edit</button><button type="button" onClick={() => handleDelete(card)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50">Delete</button></div></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filteredCards.length === 0 && <div className="p-8 text-center"><p className="text-lg font-black text-slate-700">No cards found</p><p className="mt-1 text-sm text-slate-500">Try clearing filters or create a new card.</p></div>}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close editor" onClick={closeDrawer} className="absolute inset-0 bg-slate-950/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-[#f8f7ff] shadow-2xl md:w-[82vw] xl:w-[900px]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Card drawer editor</p><h2 className="text-2xl font-black">{editingId ? "Edit Card" : "Create Card"}</h2></div><button type="button" onClick={closeDrawer} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-200">Close</button></div>
            <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_0.82fr]">
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Section</span><select className="form-field" value={sectionId} onChange={(e) => setSectionId(Number(e.target.value))}>{sections.map((section) => <option key={section.id} value={section.id}>{section.title} ({section.section_key})</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Card Title</span><input className="form-field" placeholder="Card title / bullet text" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Description</span><textarea className="form-field min-h-28" placeholder="Card description" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Image URL</span><input className="form-field" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /></label>
                <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Button Text</span><input className="form-field" placeholder="Open / Learn more" value={buttonText} onChange={(e) => setButtonText(e.target.value)} /></label><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Button Link</span><input className="form-field" placeholder="/resources or https://..." value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} /></label></div>
                <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Display Order</span><input className="form-field" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></label><label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</span><select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}><option value={1}>Active</option><option value={0}>Disabled</option></select></label></div>
                <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><button className="btn-primary">{editingId ? "Update Card" : "Create Card"}</button><button type="button" onClick={closeDrawer} className="btn-secondary">Cancel</button></div>
              </form>
              <section className="border-l border-slate-200 bg-white p-5"><p className="eyebrow">Live preview</p><div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">{imageUrl && <img src={imageUrl} alt="Card preview" className="h-48 w-full object-cover" />}<div className="p-5"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{selectedSection?.section_key || "section"}</span><h3 className="mt-3 text-2xl font-black text-slate-950">{title || "Card title preview"}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{description || "Card description preview will appear here as you type."}</p>{buttonText && <p className="mt-4 font-black text-violet-700">{buttonText} →</p>}</div></div></section>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageCards;
