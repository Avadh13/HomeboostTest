type PricingCardProps = {
  title: string;
  price?: string;
  description?: string;
  features?: string;
};

function PricingCard({ title, price, description, features }: PricingCardProps) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-2xl font-black text-slate-950">{title}</h3>
      {price && <p className="mt-3 text-4xl font-black text-blue-700">{price}</p>}
      {description && <p className="mt-3 text-slate-600">{description}</p>}
      {features && <p className="mt-5 whitespace-pre-line text-sm text-slate-600">{features}</p>}
    </div>
  );
}

export default PricingCard;
