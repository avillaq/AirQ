"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { subscribeToAlerts } from "@/api"
import { toast } from 'sonner'

import "./interactive-map/InteractiveMap.css";

interface City {
  city: string;
  cityAscii: string;
  lat: number;
  lng: number;
  country: string;
}

export function AlertFormSection() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    location: "",
    locationDisplay: ""
  })

  const [cities, setCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch('/worldcities.csv')
      .then(response => response.text())
      .then(data => {
        const lines = data.split('\n').slice(1);
        const parsedCities = lines.map(line => {
          const match = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
          if (match) {
            return {
              city: match[1],
              cityAscii: match[2],
              lat: parseFloat(match[3]),
              lng: parseFloat(match[4]),
              country: match[5]
            };
          }
          return null;
        }).filter((city): city is City => city !== null);
        setCities(parsedCities);
      })
      .catch(error => console.error('Error loading cities:', error));
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = cities
        .filter(city =>
          city.cityAscii.toLowerCase().includes(searchQuery.toLowerCase()) ||
          city.country.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10);
      setFilteredCities(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredCities([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, cities]);

  const handleCitySelect = (city: City) => {
    const locationString = `${city.city}, ${city.country}`;
    setFormData({
      ...formData,
      location: `${city.lat},${city.lng}`,
      locationDisplay: locationString
    });
    setSearchQuery(locationString);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await subscribeToAlerts(formData)
      if (result.status === 'ok') {
        toast.success(result.message || "Subscribed successfully!")
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          age: "",
          location: "",
          locationDisplay: ""
        })
        setSearchQuery("")
      } else {
        toast.error(result.message || "Subscription failed. Please try again.")
      }
    } catch (error: any) {
      toast.error(error?.message || "Subscription failed. Please try again.")
    }

  }

  return (
    <section id="alert-form" className="w-full py-12 relative overflow-hidden">
      <div className="absolute inset-0 top-[-90px] pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 1388 825"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <mask
            id="mask0_alert_form"
            style={{ maskType: "alpha" }}
            maskUnits="userSpaceOnUse"
            x="269"
            y="27"
            width="850"
            height="493"
          >
            <rect x="269.215" y="27.4062" width="849.57" height="492.311" fill="url(#paint0_linear_alert)" />
          </mask>
          <g mask="url(#mask0_alert_form)">
            <g filter="url(#filter0_f_alert)">
              <ellipse
                cx="694"
                cy="-93.0414"
                rx="670.109"
                ry="354.908"
                fill="url(#paint1_radial_alert)"
                fillOpacity="0.8"
              />
            </g>
            <ellipse cx="694" cy="-91.5385" rx="670.109" ry="354.908" fill="url(#paint2_linear_alert)" />
            <ellipse cx="694" cy="-93.0414" rx="670.109" ry="354.908" fill="url(#paint3_linear_alert)" />
          </g>
          <defs>
            <filter
              id="filter0_f_alert"
              x="-234.109"
              y="-705.949"
              width="1856.22"
              height="1225.82"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="129" result="effect1_foregroundBlur_alert" />
            </filter>
            <linearGradient
              id="paint0_linear_alert"
              x1="1118.79"
              y1="273.562"
              x2="269.215"
              y2="273.562"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="hsl(var(--background))" stopOpacity="0" />
              <stop offset="0.2" stopColor="hsl(var(--background))" stopOpacity="0.8" />
              <stop offset="0.8" stopColor="hsl(var(--background))" stopOpacity="0.8" />
              <stop offset="1" stopColor="hsl(var(--background))" stopOpacity="0" />
            </linearGradient>
            <radialGradient
              id="paint1_radial_alert"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(683.482 245.884) rotate(-3.78676) scale(469.009 248.4)"
            >
              <stop offset="0.1294" stopColor="hsl(var(--primary-dark))" />
              <stop offset="0.2347" stopColor="hsl(var(--primary))" />
              <stop offset="0.3" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
            <linearGradient
              id="paint2_linear_alert"
              x1="694"
              y1="-446.446"
              x2="694"
              y2="263.369"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0" />
              <stop offset="1" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient
              id="paint3_linear_alert"
              x1="694"
              y1="-447.949"
              x2="694"
              y2="261.866"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="hsl(var(--background))" />
              <stop offset="1" stopColor="hsl(var(--background))" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl blur-xl" />
        <div className="relative bg-card/70 backdrop-blur-md border border-border rounded-2xl p-8 md:p-12 shadow-xl">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
                Receive Air Quality Alerts
              </h2>
              <p className="text-muted-foreground text-lg">
                We'll notify you when AQI in your area exceeds safe levels.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-foreground">
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="25"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="location" className="text-foreground">
                  Location to Monitor
                </Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="Search city or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                  className="bg-background/50 border-border"
                  autoComplete="off"
                />
                {showSuggestions && filteredCities.length > 0 && (
                  <div className="suggestions-dropdown">
                    {filteredCities.map((city, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => handleCitySelect(city)}
                      >
                        <span className="city-name">{city.city}</span>
                        <span className="country-name">{city.country}</span>
                      </div>
                    ))}
                  </div>
                )}
                {formData.locationDisplay && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {formData.locationDisplay}
                  </p>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  ⚠️ <strong>Personalized Alert:</strong> Based on your age, you will receive notifications when AQI exceeds your personalized threshold:
                  <br />
                  <span className="text-xs mt-2 block">
                    • Children (0-12): AQI &gt; 50
                    <br />
                    • Teenagers (13-18): AQI &gt; 75
                    <br />
                    • Adults (19-64): AQI &gt; 100
                    <br />
                    • Seniors (65+): AQI &gt; 50
                  </span>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-lg font-medium"
                size="lg"
              >
                Activate Alerts
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}