import { HeroSection } from "@/components/hero-section"
import { AQIClimateSection } from "@/components/aqi-climate-section"
import { MapBox } from "@/components/mapbox-map"
import { AlertFormSection } from "@/components/alert-form-section"
import { FooterSection } from "@/components/footer-section"
import { AnimatedSection } from "@/components/animated-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-0">
      <div className="relative z-10">
        <main className="max-w-[1320px] mx-auto relative">
          <HeroSection />
        </main>
        
        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-16 px-5" delay={0.1}>
          <AQIClimateSection />
        </AnimatedSection>

        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-16 px-5" delay={0.2}>
          <MapBox />
        </AnimatedSection>

        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-16 px-5" delay={0.3}>
          <AlertFormSection />
        </AnimatedSection>

        <AnimatedSection className="relative z-10 max-w-[1320px] mx-auto mt-16" delay={0.4}>
          <FooterSection />
        </AnimatedSection>
      </div>
    </div>
  )
}