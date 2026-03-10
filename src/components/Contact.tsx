import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      title: "Interest registered",
      description: "We'll be in touch within 24 hours.",
    });
  };

  const contactInfo = [
    { icon: Mail, title: "Email", lines: ["info@dentarad.co.uk"] },
    { icon: Clock, title: "Turnaround", lines: ["Standard: 2-3 working days", "Priority: 24 hours"] },
    { icon: MapPin, title: "Coverage", lines: ["UK-wide teleradiology service"] },
  ];

  return (
    <section id="register" className="py-24 bg-[hsl(215,84%,6%)] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Register Your Interest
          </h2>
          <p className="text-primary-foreground/50 max-w-2xl mx-auto">
            Get access to our secure referral portal. We'll contact you within
            24 hours to get you set up.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {contactInfo.map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-5 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 hover:border-accent/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-primary-foreground text-sm">{item.title}</p>
                  {item.lines.map((line, i) => (
                    <p key={i} className="text-primary-foreground/50 text-sm">{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="rounded-xl border border-accent/30 bg-primary-foreground/5 flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-primary-foreground mb-2">
                  Thank you!
                </h3>
                <p className="text-primary-foreground/50 text-center max-w-sm">
                  Your interest has been registered. We'll be in touch within
                  24 hours to set up your portal access.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <h3 className="text-lg font-semibold text-primary-foreground">
                    Practice Details
                  </h3>
                </div>
                <div className="px-6 pb-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm text-primary-foreground/70">First Name</Label>
                        <Input id="firstName" placeholder="Dr. John" required className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm text-primary-foreground/70">Last Name</Label>
                        <Input id="lastName" placeholder="Smith" required className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm text-primary-foreground/70">Email Address</Label>
                      <Input id="email" type="email" placeholder="john.smith@dentalclinic.co.uk" required className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm text-primary-foreground/70">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="+44 20 7XXX XXXX" className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="practice" className="text-sm text-primary-foreground/70">Practice Name</Label>
                      <Input id="practice" placeholder="Your Dental Practice" required className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="volume" className="text-sm text-primary-foreground/70">Expected Monthly Volume</Label>
                      <Select>
                        <SelectTrigger className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground">
                          <SelectValue placeholder="Select expected volume" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-5">1-5 scans per month</SelectItem>
                          <SelectItem value="6-15">6-15 scans per month</SelectItem>
                          <SelectItem value="16-30">16-30 scans per month</SelectItem>
                          <SelectItem value="30+">30+ scans per month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-sm text-primary-foreground/70">
                        Additional Information <span className="text-primary-foreground/30">(optional)</span>
                      </Label>
                      <Textarea id="message" placeholder="Any specific requirements or questions..." rows={3} className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30" />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold shadow-gold"
                    >
                      Register Interest
                    </Button>
                    <p className="text-xs text-primary-foreground/30 text-center">
                      By registering, you agree to our terms and conditions.
                    </p>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
