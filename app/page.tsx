import "./landing.css";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Demo } from "@/components/landing/demo";
import { VideoScreencast } from "@/components/landing/video-screencast";
import { Integrations } from "@/components/landing/integrations";
import { Comparison } from "@/components/landing/comparison";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { LandingFooter } from "@/components/landing/footer";
import { CookieBanner } from "@/components/landing/cookie-banner";

export default function HomePage() {
  return (
    <div className="landing">
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <VideoScreencast />
        <Features />
        <Demo />
        <Integrations />
        <Comparison />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <LandingFooter />
      <CookieBanner />
    </div>
  );
}
