import "../landing.css";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing">
      <LandingNav />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
