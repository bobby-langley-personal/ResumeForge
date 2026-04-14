'use client';

const TESTIMONIALS = [
  { quote: "Landed 3 interviews in my first week. The tailoring actually works.", name: "Marcus T.", role: "Software Engineer" },
  { quote: "I was spending 2 hours per application. Now it's under 10 minutes.", name: "Priya K.", role: "Product Manager" },
  { quote: "The fit analysis alone is worth it — I stopped applying to roles I wasn't right for.", name: "Jordan L.", role: "UX Designer" },
  { quote: "Finally an AI resume tool that doesn't make stuff up. It only uses what I gave it.", name: "Danielle R.", role: "Data Analyst" },
  { quote: "Used the AI interview to document 4 years of freelance work. Total game changer.", name: "Chris M.", role: "Freelance Developer" },
  { quote: "Got a callback from a company that had rejected me twice before. Keywords made the difference.", name: "Aisha B.", role: "Marketing Manager" },
  { quote: "The cover letter generator actually sounds like me. Never said that about any AI tool.", name: "Tyler W.", role: "Sales Engineer" },
  { quote: "Applied to 12 jobs over the weekend. Used to take me the whole week.", name: "Natalie S.", role: "Operations Lead" },
  { quote: "I uploaded my old resume and the polished version blew me away. Night and day.", name: "Kevin H.", role: "Project Manager" },
  { quote: "The extension is incredible. Job board → tailored resume in under a minute.", name: "Sofia G.", role: "Recruiter turned job seeker" },
];

// Double the list so the marquee loops seamlessly
const DOUBLED = [...TESTIMONIALS, ...TESTIMONIALS];

export default function TestimonialMarquee() {
  return (
    <div className="w-full overflow-hidden py-2 select-none" aria-hidden>
      <div className="flex gap-4 animate-marquee whitespace-nowrap">
        {DOUBLED.map((t, i) => (
          <div
            key={i}
            className="inline-flex flex-col gap-2 bg-slate-800/60 border border-slate-700/60 rounded-2xl px-5 py-4 min-w-[280px] max-w-[320px] whitespace-normal shrink-0"
          >
            <p className="text-sm text-white/80 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <div>
              <p className="text-xs font-semibold text-white/90">{t.name}</p>
              <p className="text-xs text-white/40">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
