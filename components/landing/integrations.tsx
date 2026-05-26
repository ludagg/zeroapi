import { Reveal } from "@/components/landing/reveal";

const LOGOS = [
  {
    name: "Railway",
    svg: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="6" cy="20" r="1.2" fill="currentColor" />
        <circle cx="12" cy="20" r="1.2" fill="currentColor" />
      </>
    ),
  },
  {
    name: "Render",
    svg: (
      <>
        <circle cx="9" cy="12" r="6" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="9" cy="12" r="2" fill="currentColor" />
      </>
    ),
  },
  {
    name: "Vercel",
    svg: <path d="M9 4l8 14H1L9 4z" fill="currentColor" />,
  },
  {
    name: "Fly.io",
    svg: (
      <path
        d="M2 18 C 5 8, 9 8, 12 14 S 17 22, 18 14"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    ),
  },
  {
    name: "Postgres",
    svg: (
      <>
        <ellipse cx="9" cy="12" rx="6" ry="7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 12c2 2 6 2 8 0" stroke="currentColor" strokeWidth="1.4" fill="none" />
      </>
    ),
  },
  {
    name: "MySQL",
    svg: (
      <>
        <path
          d="M3 14c2-4 5-6 8-2s5 6 7 2"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="15" cy="9" r="1.3" fill="currentColor" />
      </>
    ),
  },
  {
    name: "SQLite",
    svg: (
      <>
        <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 10h8M6 14h8" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
  },
  {
    name: "Mongo",
    svg: (
      <>
        <path
          d="M10 3 C 6 9, 6 16, 10 21 C 14 16, 14 9, 10 3z"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
        />
        <line x1="10" y1="3" x2="10" y2="21" stroke="currentColor" strokeWidth="1" />
      </>
    ),
  },
];

export function Integrations() {
  return (
    <section style={{ paddingTop: 0 }}>
      <div className="wrap">
        <Reveal className="integrations-head">
          <h3>Déploie où tu veux · stocke ce que tu veux</h3>
        </Reveal>
        <Reveal as="div" className="logo-rail">
          {LOGOS.map((l) => (
            <div className="logo-cell" key={l.name} title={l.name}>
              <svg viewBox="0 0 100 24" fill="none">
                {l.svg}
                <text
                  x="22"
                  y="17"
                  fontFamily="Space Grotesk, sans-serif"
                  fontSize="13"
                  fontWeight="600"
                  fill="currentColor"
                >
                  {l.name}
                </text>
              </svg>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
