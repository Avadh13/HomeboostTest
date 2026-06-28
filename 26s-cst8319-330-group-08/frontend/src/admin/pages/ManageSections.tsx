import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../../api/api";
import AdminLayout from "../components/AdminLayout";

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

type Page = {
  id: number;
  slug: string;
  title: string;
};

function ManageSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

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
  const isVideoEditor = sectionKey === "video_walkthrough";

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
      setPageId(safePages[0].id);
    }
  };

  useEffect(() => {
    loadSections();
    loadPages();
  }, []);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const useVideoTemplate = () => {
    setEditingId(null);
    setPageId(homePage?.id || pages[0]?.id || 1);
    setSectionKey("video_walkthrough");
    setTitle("Video walkthrough");
    setSubtitle("Show the employee journey in seconds.");
    setContent("Use this section for the final promo video, a Loom walkthrough, or a short demo showing how employees enter their employer portal and book next steps.");
    setImageUrl("https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80");
    setButtonText("Watch demo");
    setButtonLink("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4");
    setDisplayOrder(3);
    setIsActive(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingId ? `${API_BASE_URL}/sections/${editingId}` : `${API_BASE_URL}/sections`;
    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_id: pageId,
        section_key: sectionKey,
        title,
        subtitle,
        content,
        image_url: imageUrl,
        button_text: buttonText,
        button_link: buttonLink,
        display_order: displayOrder,
        is_active: isActive,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert(editingId ? "Section updated" : "Section created");
    resetForm();
    loadSections();
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = confirm("Delete this section?");
    if (!confirmDelete) return;

    const response = await fetch(`${API_BASE_URL}/sections/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert("Section deleted");
    loadSections();
  };

  return (
    <AdminLayout title="Manage Sections">
      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="theme-panel">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-200">CMS module editor</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Editable Home Video Section</h2>
          <p className="mt-3 max-w-3xl text-violet-100">
            For the homepage video block, use section key <strong>video_walkthrough</strong>. Paste a direct MP4/WebM link, YouTube link, Vimeo link, or Loom share link in Button Link. Use Image URL for the poster image.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={useVideoTemplate} className="rounded-full bg-white px-5 py-3 text-sm font-black text-violet-800 hover:bg-violet-50">
              Use Video Section Template
            </button>
            <Link to="/admin/cards" className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white hover:bg-white/10">
              Edit video bullet points in Cards
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="premium-card mb-8 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{isVideoEditor ? "Home video editor" : "Section editor"}</p>
            <h2 className="mt-1 text-2xl font-black">{editingId ? "Edit Section" : "Add Section"}</h2>
          </div>
          {isVideoEditor && <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">Video section mode</span>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <select className="form-field" value={pageId} onChange={(e) => setPageId(Number(e.target.value))}>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>{page.title}</option>
            ))}
          </select>

          <input className="form-field" placeholder="Section Key" value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} />
        </div>

        {isVideoEditor && (
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm text-slate-700">
            <p className="font-black text-violet-700">Video mapping</p>
            <p className="mt-1">Title = small label, Subtitle = big heading, Content = paragraph, Image URL = poster image, Button Link = video/embed link.</p>
          </div>
        )}

        <div className="mt-4 grid gap-4">
          <input className="form-field" placeholder={isVideoEditor ? "Small Label, example: Video walkthrough" : "Section Title"} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="form-field" placeholder={isVideoEditor ? "Big Heading, example: Show the employee journey in seconds." : "Subtitle"} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          <textarea className="form-field min-h-28" placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
          <input className="form-field" placeholder={isVideoEditor ? "Poster Image URL" : "Image URL"} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input className="form-field" placeholder={isVideoEditor ? "Button Text / internal label" : "Button Text"} value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
          <input className="form-field" placeholder={isVideoEditor ? "Video URL: MP4, WebM, YouTube, Vimeo, or Loom" : "Button Link"} value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input className="form-field" type="number" placeholder="Display Order" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
          <select className="form-field" value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}>
            <option value={1}>Active</option>
            <option value={0}>Disabled</option>
          </select>
        </div>

        {isVideoEditor && buttonLink && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-600">Saved video link preview</p>
            <p className="mt-2 break-all text-sm text-slate-600">{buttonLink}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary">{editingId ? "Update Section" : "Add Section"}</button>
          {editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
        </div>
      </form>

      <div className="premium-card overflow-x-auto p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-black">All Sections</h2>
          <p className="text-sm font-semibold text-slate-500">Use cards for bullet points inside special sections.</p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-sm uppercase tracking-wide text-slate-500">
              <th className="p-3">ID</th>
              <th className="p-3">Page</th>
              <th className="p-3">Key</th>
              <th className="p-3">Title</th>
              <th className="p-3">Order</th>
              <th className="p-3">Active</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => (
              <tr key={section.id} className="border-b last:border-0">
                <td className="p-3 font-bold">{section.id}</td>
                <td className="p-3">{section.page_title}</td>
                <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${section.section_key === "video_walkthrough" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700"}`}>{section.section_key}</span></td>
                <td className="p-3 font-semibold">{section.title}</td>
                <td className="p-3">{section.display_order}</td>
                <td className="p-3">{section.is_active ? "Yes" : "No"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(section)} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700">Edit</button>
                    <button onClick={() => handleDelete(section.id)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sections.length === 0 && <p className="mt-4 text-gray-500">No sections found.</p>}
      </div>
    </AdminLayout>
  );
}

export default ManageSections;
