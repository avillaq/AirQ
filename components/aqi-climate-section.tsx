"use client"

import { Activity, AlertTriangle, Car, Factory, Globe, Microscope, Sun, Wind } from "lucide-react"

export function AQIClimateSection() {
  const compounds = [
    {
      name: "PM2.5",
      icon: Microscope,
      description: "Partículas microscópicas menores a 2.5 micrómetros que penetran profundamente en los pulmones y el torrente sanguíneo.",
      effects: "Pueden causar problemas respiratorios, agravar enfermedades cardíacas y reducir la función pulmonar, especialmente en niños y adultos mayores.",
      color: "from-amber-500/10 to-orange-500/10",
      borderColor: "border-amber-500/20"
    },
    {
      name: "PM10",
      icon: Wind,
      description: "Partículas respirables de hasta 10 micrómetros provenientes de polvo, polen y emisiones industriales.",
      effects: "Irritan las vías respiratorias superiores, causan tos y dificultad para respirar, y pueden agravar el asma y otras enfermedades pulmonares.",
      color: "from-orange-500/10 to-red-500/10",
      borderColor: "border-orange-500/20"
    },
    {
      name: "Ozone (O₃)",
      icon: Sun,
      description: "Gas formado por reacciones entre óxidos de nitrógeno y compuestos orgánicos volátiles bajo la luz solar.",
      effects: "Irrita los pulmones, reduce la función respiratoria, causa tos y dolor al respirar profundamente. Agrava el asma y otras enfermedades pulmonares.",
      color: "from-blue-500/10 to-cyan-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      name: "Nitrogen Dioxide (NO₂)",
      icon: Car,
      description: "Gas marrón rojizo producido principalmente por vehículos y plantas de energía que queman combustibles fósiles.",
      effects: "Inflama las vías respiratorias, reduce la resistencia a infecciones respiratorias y empeora condiciones como asma y bronquitis.",
      color: "from-red-500/10 to-pink-500/10",
      borderColor: "border-red-500/20"
    },
    {
      name: "Sulfur Dioxide (SO₂)",
      icon: Factory,
      description: "Gas incoloro con olor penetrante generado por la quema de carbón y petróleo en industrias y centrales eléctricas.",
      effects: "Provoca broncoconstricción, dificulta la respiración e irrita ojos y garganta. Las personas con asma son especialmente vulnerables.",
      color: "from-purple-500/10 to-violet-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      name: "Carbon Monoxide (CO)",
      icon: AlertTriangle,
      description: "Gas tóxico, inodoro e incoloro producido por combustión incompleta de combustibles en vehículos y calderas.",
      effects: "Reduce la capacidad de la sangre para transportar oxígeno, causando fatiga, dolor de cabeza, mareos y, en casos severos, puede ser fatal.",
      color: "from-gray-500/10 to-slate-500/10",
      borderColor: "border-gray-500/20"
    }
  ]

  return (
    <section id="aqi-section" className="w-full pt-20 md:pt-32 pb-20 md:pb-32 px-5 relative flex flex-col justify-center items-center">
      <div className="w-[400px] h-[400px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/5 blur-[120px] z-0" />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col justify-start items-center gap-4 text-center mb-16">
          <h2 className="text-foreground text-4xl md:text-5xl lg:text-[56px] font-semibold leading-tight md:leading-tight lg:leading-[64px] break-words max-w-4xl">
            Compuestos del aire y su impacto
          </h2>
          <p className="text-muted-foreground text-base md:text-lg font-medium leading-relaxed break-words max-w-3xl">
            Conoce los principales contaminantes atmosféricos, su origen y cómo afectan tu salud y tu comunidad
          </p>
        </div>

        {/* Compounds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {compounds.map((compound, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br ${compound.color} ${compound.borderColor} shadow-xl bg-card/60`}
            >
              <div className="p-6 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <compound.icon className="h-8 w-8 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">{compound.name}</h3>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                      {compound.description}
                    </p>
                  </div>

                  {/* Effects */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-start gap-2">
                      <Activity className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Efectos: </span>
                        {compound.effects}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-3xl" />
            </div>
          ))}
        </div>

        <div className="mt-16 bg-card/50 backdrop-blur-md border border-border rounded-2xl p-8 md:p-10 text-center shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground">
              ¿Por qué es importante monitorear la calidad del aire?
            </h3>
            <p className="text-muted-foreground text-base max-w-3xl leading-relaxed">
              La exposición prolongada al aire contaminado puede tener efectos graves en la salud.
              Monitorear estos contaminantes te permite tomar decisiones informadas sobre cuándo
              realizar actividades al aire libre, usar protección respiratoria o permanecer en interiores,
              especialmente para proteger a grupos vulnerables como niños, adultos mayores y personas
              con condiciones respiratorias o cardíacas preexistentes.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}