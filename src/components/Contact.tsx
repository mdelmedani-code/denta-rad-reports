import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <section id="register" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-accent font-medium mb-3">Get Started</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight mb-3">
            Register Your Interest
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            Get access to our secure referral portal. We'll contact you within
            24 hours to get you set up.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {contactInfo.map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-5 rounded-lg border border-border bg-card hover:border-accent/30 transition-colors">
                <div className="w-9 h-9 rounded-full border border-accent/20 bg-accent/5 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{item.title}</p>
                  {item.lines.map((line, i) => (
                    <p key={i} className="text-muted-foreground text-sm">{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="rounded-lg border border-accent/30 bg-card flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full border border-accent/20 bg-accent/5 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Thank you
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Your interest has been registered. We'll be in touch within
                  24 hours to set up your portal access.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <h3 className="text-base font-semibold text-foreground">
                    Practice Details
                  </h3>
                </div>
                <div className="px-6 pb-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm">First Name</Label>
                        <Input id="firstName" placeholder="Dr. John" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                        <Input id="lastName" placeholder="Smith" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm">Email Address</Label>
                      <Input id="email" type="email" placeholder="john.smith@dentalclinic.co.uk" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="+44 20 7XXX XXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="practice" className="text-sm">Practice Name</Label>
                      <Input id="practice" placeholder="Your Dental Practice" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="volume" className="text-sm">Expected Monthly Volume</Label>
                      <Select>
                        <SelectTrigger>
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
                      <Label htmlFor="occupation" className="text-sm">Occupation</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your occupation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dentist">Dentist</SelectItem>
                          <SelectItem value="medical-doctor">Medical Doctor</SelectItem>
                          <SelectItem value="practice-manager">Practice Manager</SelectItem>
                          <SelectItem value="dental-nurse">Dental Nurse</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                        </SelectContent>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-sm">
                        Additional Information <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea id="message" placeholder="Any specific requirements or questions..." rows={3} />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-medium"
                    >
                      Register Interest
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
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
