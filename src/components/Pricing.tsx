import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Plus } from "lucide-react";

const Pricing = () => {
  const pricingTiers = [
    {
      size: "Up to 5×5cm",
      price: "£125",
      description: "Small field of view scans"
    },
    {
      size: "Up to 8×5cm",
      price: "£145", 
      description: "Medium field of view scans"
    },
    {
      size: "Up to 8×8cm",
      price: "£165",
      description: "Large field of view scans"
    },
    {
      size: "Over 8×8cm",
      price: "£185",
      description: "Extended field of view scans"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Clear, volume-based pricing with no hidden fees. Professional reporting at competitive rates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pricingTiers.map((tier, index) => (
            <Card 
              key={index}
              className="relative bg-gradient-card border-silver/20 shadow-soft hover:shadow-medium transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg font-semibold text-foreground mb-2">
                  {tier.size}
                </CardTitle>
                <div className="text-3xl font-bold text-primary mb-2">
                  {tier.price}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span>Comprehensive report</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span>3-5 working days</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    <span>Incidental findings</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="bg-gradient-card border-gold/20 shadow-gold">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Priority 24h Service
                </CardTitle>
                <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20">
                  Optional
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-lg font-semibold text-foreground">Additional £50</span>
                <span className="text-sm text-muted-foreground">per scan</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Urgent reporting within 24 hours for time-sensitive clinical decisions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-gold/20 shadow-gold">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  IAN Nerve Tracing
                </CardTitle>
                <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20">
                  Add-on
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-lg font-semibold text-foreground">£50 per side</span>
                <span className="text-sm text-muted-foreground">detailed tracing</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Detailed inferior alveolar nerve pathway analysis for surgical planning
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button variant="hero" size="lg" className="text-lg px-8 py-6 h-auto">
            Get Started Today
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No subscription fees • Pay per scan • Professional indemnity included
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;