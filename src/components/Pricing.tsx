import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import fovSmall from "@/assets/fov-small.png";
import fovMedium from "@/assets/fov-medium.png";
import fovLarge from "@/assets/fov-large.png";
import fovExtended from "@/assets/fov-extended.png";

const Pricing = () => {
  const tiers = [
    { size: "Up to 5×5cm", price: "£130", label: "Small FOV", image: fovSmall },
    { size: "Up to 8×5cm", price: "£150", label: "Medium FOV", image: fovMedium },
    { size: "Up to 8×8cm", price: "£170", label: "Large FOV", image: fovLarge },
    { size: "Over 8×8cm", price: "£195", label: "Extended FOV", image: fovExtended },
  ];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-accent font-medium mb-3">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight mb-3">
            Transparent Pricing
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            Clear pricing based on field of view. No subscription fees.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {tiers.map((tier, index) => (
            <div key={index} className="flex flex-col items-center gap-3">
              <div className="w-full text-center rounded-lg border border-border bg-card hover:border-accent/40 hover:shadow-soft transition-all duration-300">
                <div className="h-px bg-accent" />
                <div className="pb-2 pt-6 px-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-medium">
                    CBCT — {tier.label}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {tier.size}
                  </p>
                </div>
                <div className="pt-0 pb-6 px-4">
                  <p className="text-3xl font-bold text-primary">
                    {tier.price}
                  </p>
                </div>
              </div>
              <img
                src={tier.image}
                alt={tier.label}
                className="h-24 w-auto object-contain"
              />
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-5 hover:border-accent/30 transition-colors">
            <div>
              <p className="font-semibold text-foreground text-sm">
                OPG Report
              </p>
              <p className="text-xs text-muted-foreground">
                Standalone OPG radiograph report
              </p>
            </div>
            <Badge className="bg-accent/10 text-accent-foreground border-accent/20 font-bold">
              £55
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-5 hover:border-accent/30 transition-colors">
            <div>
              <p className="font-semibold text-foreground text-sm">
                Priority 24h Service
              </p>
              <p className="text-xs text-muted-foreground">
                Urgent reporting within 24 hours
              </p>
            </div>
            <Badge className="bg-accent/10 text-accent-foreground border-accent/20 font-bold">
              +50%
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
