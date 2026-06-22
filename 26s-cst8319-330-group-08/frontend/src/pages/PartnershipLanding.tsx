import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API_BASE_URL from "../api/api";
import Navbar from "../components/Navbar";
import ChatWidget from "../components/ChatWidget";

const brandImage =
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1400&q=80";

const meetingImage =
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

        const normalizedPartnership: Partnership = {
          ...data,
          partnership_id: data.partnership_id || data.id,
          partnership_slug: data.partnership_slug || data.slug || slug || "",
          team_name: data.team_name || data.hbt_name || "Home Buying Team",
          brand_primary_color: data.brand_primary_color || "#2563eb",
          brand_secondary_color: data.brand_secondary_color || "#eff6ff",
        };

        setPartnership(normalizedPartnership);

        if (Array.isArray(data.team_members)) {
          setTeamMembers(data.team_members);
        } else if (Array.isArray(data.members)) {
          setTeamMembers(data.members);
        } else {
          setTeamMembers([]);
        }
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

  const fallbackMembers = useMemo<TeamMember[]>(() => {
    if (teamMembers.length > 0) return teamMembers;

    if (!partnership) return [];

    return [
      {
        id: 1,
        full_name: partnership.team_name || partnership.hbt_name || "Home Buying Team",
        title: "Home Buying Support Team",
        bio: "Your assigned Home Buying Team can help with guidance, resources, next steps, and appointment support.",
        photo_url: meetingImage,
        email: partnership.hbt_email || null,
        phone: partnership.hbt_phone || null,
      },
    ];
  }, [teamMembers, partnership]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="font-semibold text-slate-600">
              Loading employer program...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!partnership) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center px-6">
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
            <h1 className="text-3xl font-black">Employer page not found</h1>

            <p className="mt-3 text-slate-600">
              This partnership slug is not active yet.
            </p>

            <Link to="/" className="btn-primary mt-6">
              Go home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const primary = partnership.brand_primary_color || "#2563eb";
  const secondary = partnership.brand_secondary_color || "#eff6ff";
  const partnershipSlug = partnership.partnership_slug || partnership.slug || slug || "";
  const teamName = partnership.team_name || partnership.hbt_name || "Home Buying Team";

  return (
    <main
      className="min-h-screen text-slate-950"
      style={{ backgroundColor: secondary }}
    >
      <Navbar />

      <section className="relative overflow-hidden px-6 py-16 md:py-24">
        <div
          className="floating-orb -left-24 top-16 h-80 w-80"
          style={{ backgroundColor: primary }}
        />

        <div className="floating-orb right-0 top-48 h-96 w-96 bg-white" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-black shadow-sm backdrop-blur">
              <span
                className="mr-2 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: primary }}
              />
              Employer Benefit Program
            </div>

            {partnership.logo_url && (
              <img
                src={partnership.logo_url}
                alt={partnership.employer_name}
                className="mb-6 h-16 rounded-2xl object-contain"
              />
            )}

            <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
              {partnership.employer_name} Home Buying Benefit
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-700">
              Employees get step-by-step home-buying education, trusted expert
              support, events, quizzes, and booking links from{" "}
              <strong>{teamName}</strong>.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to={`/signup?partnership=${partnershipSlug}`}
                className="rounded-full px-7 py-3 font-black text-white shadow-lg transition hover:-translate-y-1"
                style={{ backgroundColor: primary }}
              >
                Create Employee Account
              </Link>

              <Link to="/login" className="btn-secondary">
                Already registered? Login
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["✓", "Personalized portal"],
                ["✓", "Expert guidance"],
                ["✓", "Free resources"],
              ].map(([icon, text]) => (
                <div
                  key={text}
                  className="rounded-3xl bg-white/80 p-4 font-bold shadow-sm backdrop-blur"
                >
                  <span className="mr-2" style={{ color: primary }}>
                    {icon}
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <img
              src={brandImage}
              alt="Employer benefit home"
              className="h-[520px] w-full rounded-[2.5rem] object-cover shadow-2xl"
            />

            <div className="glass-card absolute -bottom-8 left-6 right-6 rounded-[2rem] p-6">
              <p
                className="text-sm font-black uppercase tracking-[0.22em]"
                style={{ color: primary }}
              >
                Connected partnership
              </p>

              <h3 className="mt-1 text-2xl font-black">{teamName}</h3>

              <p className="mt-2 text-slate-600">
                This page is powered by partnership slug:{" "}
                <strong>/{partnershipSlug}</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            [
              "1",
              "Learn",
              "Read simple guides about mortgage readiness, budgets, down payments, and closing steps.",
            ],
            [
              "2",
              "Plan",
              "Take the readiness quiz and understand your next best action before shopping.",
            ],
            [
              "3",
              "Connect",
              "Book time with the right expert from your assigned Home Buying Team.",
            ],
          ].map(([step, title, text]) => (
            <div
              key={title}
              className="rounded-[2rem] bg-white/85 p-7 shadow-xl transition hover:-translate-y-2"
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-full font-black text-white"
                style={{ backgroundColor: primary }}
              >
                {step}
              </div>

              <h3 className="text-2xl font-black">{title}</h3>

              <p className="mt-3 leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white/70 px-6 py-20 backdrop-blur">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <img
            src={meetingImage}
            alt="Advisor meeting"
            className="h-[420px] w-full rounded-[2.5rem] object-cover shadow-2xl"
          />

          <div>
            <p
              className="text-sm font-black uppercase tracking-[0.25em]"
              style={{ color: primary }}
            >
              Employee journey
            </p>

            <h2 className="mt-3 text-4xl font-black md:text-5xl">
              From confused to confident.
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              This program gives employees a safe place to start. They do not
              need to already understand mortgages, real estate, or pre-approval.
              The portal guides them step by step.
            </p>

            <Link
              to={`/signup?partnership=${partnershipSlug}`}
              className="mt-8 inline-flex rounded-full px-7 py-3 font-black text-white shadow-lg transition hover:-translate-y-1"
              style={{ backgroundColor: primary }}
            >
              Join Program
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end">
            <div>
              <p
                className="text-sm font-black uppercase tracking-[0.25em]"
                style={{ color: primary }}
              >
                Connect
              </p>

              <h2 className="mt-3 text-4xl font-black md:text-5xl">
                Your Home Buying Team
              </h2>
            </div>

            <p className="text-lg leading-relaxed text-slate-700">
              Book an appointment with a specialist when you are ready to talk
              through your next step.
            </p>
          </div>

          <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {fallbackMembers.map((member) => (
              <article
                key={member.id}
                className="overflow-hidden rounded-[2rem] bg-white/90 shadow-xl ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="h-72 w-full overflow-hidden bg-slate-100">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: "center 18%" }}
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-5xl font-black text-white"
                      style={{ backgroundColor: primary }}
                    >
                      {member.full_name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                </div>

                <div className="p-7">
                  <h3 className="text-2xl font-black text-slate-950">
                    {member.full_name}
                  </h3>

                  {member.title && (
                    <p
                      className="mt-2 text-lg font-bold"
                      style={{ color: primary }}
                    >
                      {member.title}
                    </p>
                  )}

                  {member.bio && (
                    <p className="mt-5 leading-relaxed text-slate-600">
                      {member.bio}
                    </p>
                  )}

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      to={`/signup?partnership=${partnershipSlug}`}
                      className="rounded-full px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-1"
                      style={{ backgroundColor: primary }}
                    >
                      Book appointment
                    </Link>

                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                      >
                        Email
                      </a>
                    )}
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
