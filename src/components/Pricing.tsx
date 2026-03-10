import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const Pricing = () => {
  const tiers = [
    { size: "Up to 5×5cm", price: "£125", label: "Small FOV" },
    { size: "Up to 8×5cm", price: "£145", label: "Medium FOV" },
    { size: "Up to 8×8cm", price: "£165", label: "Large FOV" },
    { size: "Over 8×8cm", price: "£185", label: "Extended FOV" },
  ];

  return (
    <section className="py-24 bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Clear pricing based on field of view. No subscription fees.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className="text-center rounded-xl border border-border bg-white/70 backdrop-blur-sm hover:border-accent/50 hover:shadow-gold transition-all duration-300 overflow-hidden"
            >
              <div className="h-0.5 bg-accent" />
              <div className="pb-2 pt-6 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 font-medium">
                  {tier.label}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {tier.size}
                </p>
              </div>
              <div className="pt-0 pb-6 px-4">
                <p className="text-3xl font-bold text-primary mb-4">
                  {tier.price}
                </p>
                <div className="space-y-2 text-left">
                  {["Comprehensive report", "2-3 working days", "Incidental findings"].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex items-center text-xs text-muted-foreground"
                      >
                        <Check className="w-3.5 h-3.5 text-accent mr-2 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-white/70 backdrop-blur-sm p-5 hover:border-accent/30 transition-colors">
            <div>
              <p className="font-semibold text-foreground text-sm">
                Priority 24h Service
              </p>
              <p className="text-xs text-muted-foreground">
                Urgent reporting within 24 hours
              </p>
            </div>
            <Badge className="bg-accent/10 text-accent-foreground border-accent/20 font-bold">
              +£50
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-white/70 backdrop-blur-sm p-5 hover:border-accent/30 transition-colors">
            <div>
              <p className="font-semibold text-foreground text-sm">
                IAN Nerve Tracing
              </p>
              <p className="text-xs text-muted-foreground">
                Detailed nerve pathway analysis
              </p>
            </div>
            <Badge className="bg-accent/10 text-accent-foreground border-accent/20 font-bold">
              £50/side
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
