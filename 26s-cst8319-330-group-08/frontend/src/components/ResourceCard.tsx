import { Link } from "react-router-dom";

type ResourceCardProps = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
};

function ResourceCard({ id, title, description, image_url }: ResourceCardProps) {
  return (
    <Link to={`/resources/${id}`} className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      {image_url && <img src={image_url} alt={title} className="h-44 w-full object-cover" />}
      <div className="p-6">
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
        {description && <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>}
        <p className="mt-5 text-sm font-bold text-blue-700">Read more →</p>
      </div>
    </Link>
  );
}

export default ResourceCard;
