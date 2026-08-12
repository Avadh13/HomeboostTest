import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import ChatWidget from "../components/ChatWidget";

const brandImage =
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1400&q=80";
const teamImage =
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80";

type TeamMember = {
  id: number;
  full_name: string;
  title?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Partnership = {
  id?: number;
  partnership_id?: number;
  partnership_slug?: string;
  slug?: string;
  employer_name: string;
  logo_url: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  team_name?: string;
  hbt_name?: string;
  hbt_email?: string | null;
  hbt_phone?: string | null;
  hbt_website?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  website?: string | null;
  team_members?: TeamMember[];
};

function PartnershipLanding() {
  const { slug } = useParams();
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPartnership = async () => {
      try {
        setLoading(true);
        let response = await fetch(`${API_BASE_URL}/public-partnerships/${slug}`);
        if (!response.ok) {
          response = await fetch(`${API_BASE_URL}/partnerships/public/${slug}`);
        }

        const data = await response.json();
        if (!response.ok || data.status === "error") {
          setPartnership(null);
          setTeamMembers([]);
          return;
        }

        setPartnership({
          ...data,
          partnership_id: data.partnership_id || data.id,
          partnership_slug: data.partnership_slug || data.slug || slug || "",
          team_name: data.team_name || data.hbt_name || "Home Buying Team",
          brand_primary_color: data.brand_primary_color || "#0b63d8",
          brand_secondary_color: data.brand_secondary_color || "#f5f7fb",
        });

        setTeamMembers(
          Array.isArray(data.team_members)
            ? data.team_members
            : Array.isArray(data.members)
              ? data.members
              : [],
        );
      } catch (error) {
        console.error("Partnership landing load error:", error);
        setPartnership(null);
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPartnership();
  }, [slug]);

  const displayMembers = useMemo<TeamMember[]>(() => {
    if (teamMembers.length > 0) return teamMembers;
    if (!partnership) return [];

    return [
      {
        id: 1,
        full_name: partnership.team_name || partnership.hbt_name || "Home Buying Team",
        title: "Home Buying Support Team",
        bio: "Your assigned team provides education, resources, mortgage guidance, and secure message-based support.",
        photo_url: teamImage,
        email: partnership.hbt_email || null,
        phone: partnership.hbt_phone || null,
      },
    ];
  }, [partnership, teamMembers]);

  if (loading) {
    return (
      <main className="theme-page min-h-screen">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="loading-state text-center">
            <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="font-semibold text-slate-600">Loading employer program...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!partnership) {
    return (
      <main className="theme-page min-h-screen">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center px-6">
          <div className="empty-state max-w-lg p-10 text-center">
            <h1 className="text-3xl font-black">Employer page not found</h1>
            <p className="mt-3 text-slate-600">This partnership slug is not active yet.</p>
            <Link to="/" className="btn-primary mt-6">Go Home</Link>
          </div>
        </div>
      </main>
    );
  }

  const primary = partnership.brand_primary_color || "#0b63d8";
  const secondary = partnership.brand_secondary_color || "#f5f7fb";
  const partnershipSlug = partnership.partnership_slug || partnership.slug || slug || "";
  const teamName = partnership.team_name || partnership.hbt_name || "Home Buying Team";

  return (
    <main className="min-h-screen text-slate-950" style={{ backgroundColor: secondary }}>
      <Navbar />

      <section className="px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black shadow-sm">
              <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
              Employer Home Buying Benefit
            </div>

            {partnership.logo_url && (
              <img src={partnership.logo_url} alt={partnership.employer_name} className="mb-5 h-14 rounded-xl object-contain" />
            )}

            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {partnership.employer_name} Home Buying Portal
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-700">
              Employees receive step-by-step education, trusted resources, readiness quizzes, and secure support from <strong>{teamName}</strong>.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={`/signup?partnership=${partnershipSlug}`}
                className="btn-primary"
                style={{ backgroundColor: primary, borderColor: primary }}
              >
                Create Employee Account
              </Link>
              <Link to="/login" className="btn-secondary">Employee Login</Link>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {[
                ["Personalized portal", "Resources and guidance connected to your employer."],
                ["Readiness journey", "Simple quizzes and clear next steps."],
                ["Secure support", "Message your assigned Home Buying Team."],
              ].map(([title, text]) => (
                <div key={title} className="premium-card">
                  <span className="text-blue-600">✓</span>
                  <h3 className="mt-2 font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <img src={brandImage} alt="Employer home buying benefit" className="h-[430px] w-full object-cover" />
            <div className="p-5">
              <p className="eyebrow">Connected partnership</p>
              <h2 className="mt-2 text-2xl font-black">{teamName}</h2>
              <p className="mt-2 text-sm text-slate-600">Powered by employer portal /{partnershipSlug}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">A clear path from learning to confident action.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["1", "Learn", "Review simple guides about mortgage readiness, budgets, down payments, and closing steps."],
              ["2", "Plan", "Complete the readiness quiz and follow a personalized home-buying journey."],
              ["3", "Connect", "Use secure communication to ask questions and receive guidance from your assigned team."],
            ].map(([step, title, text]) => (
              <div key={title} className="premium-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl font-black text-white" style={{ backgroundColor: primary }}>{step}</div>
                <h3 className="mt-4 text-2xl font-black">{title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Your support team</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">Meet your Home Buying Team</h2>
            </div>
            <p className="max-w-2xl text-slate-600">Create your employee account to access the portal, resources, quizzes, journey tools, and secure communication.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {displayMembers.map((member) => (
              <article key={member.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-72 bg-slate-100">
                  {member.photo_url ? (
                    <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl font-black text-white" style={{ backgroundColor: primary }}>
                      {member.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-black text-slate-950">{member.full_name}</h3>
                  {member.title && <p className="mt-1 font-bold" style={{ color: primary }}>{member.title}</p>}
                  {member.bio && <p className="mt-4 leading-relaxed text-slate-600">{member.bio}</p>}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={`/signup?partnership=${partnershipSlug}`} className="btn-primary" style={{ backgroundColor: primary, borderColor: primary }}>
                      Join Portal
                    </Link>
                    {member.email && <a href={`mailto:${member.email}`} className="btn-secondary">Email Team</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ChatWidget />
    </main>
  );
}

export default PartnershipLanding;
