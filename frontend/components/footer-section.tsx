'use client';

import Link from "next/link"

export function FooterSection() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault()
      const targetId = href.substring(1)
      const targetElement = document.getElementById(targetId)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  return (
    <footer className="w-full border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-foreground text-lg font-semibold">AirQuality Monitor</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Real-time air quality monitoring for your health and well-being. Stay informed about the air you breathe.
            </p>
          </div>

          {/* Navigation Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-foreground text-sm font-semibold uppercase tracking-wide">Navigation</h4>
            <nav className="flex flex-col gap-2">
              <Link 
                href="/" 
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Home
              </Link>
              <Link 
                href="/interactive-map" 
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Interactive Map
              </Link>
              <Link 
                href="#alert-form" 
                onClick={(e) => handleScroll(e, "#alert-form")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Alerts
              </Link>
            </nav>
          </div>

          {/* Information Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-foreground text-sm font-semibold uppercase tracking-wide">Information</h4>
            <nav className="flex flex-col gap-2">
              <Link 
                href="#aqi-section" 
                onClick={(e) => handleScroll(e, "#aqi-section")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Air Compounds
              </Link>
              <Link 
                href="#aqi-section" 
                onClick={(e) => handleScroll(e, "#aqi-section")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Health Effects
              </Link>
              <Link 
                href="#aqi-section" 
                onClick={(e) => handleScroll(e, "#aqi-section")}
                className="text-muted-foreground text-sm hover:text-primary transition-colors"
              >
                Why Monitor AQI
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-muted-foreground text-xs">
            Built for monitoring and protecting public health through air quality awareness
          </p>
        </div>
      </div>
    </footer>
  )
}