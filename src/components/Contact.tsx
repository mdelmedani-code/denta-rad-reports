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
    <section id="register" className="py-20 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Register Your Interest
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get access to our secure referral portal. We'll contact you within
            24 hours to get you set up.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            {contactInfo.map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-5 rounded-xl border border-border bg-card hover:border-accent/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-accent" />
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
              <Card className="border-accent/30">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Thank you!
                  </h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Your interest has been registered. We'll be in touch within
                    24 hours to set up your portal access.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border shadow-soft">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-foreground">
                    Practice Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                      <Label htmlFor="message" className="text-sm">
                        Additional Information <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea id="message" placeholder="Any specific requirements or questions..." rows={3} />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold shadow-gold"
                    >
                      Register Interest
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      By registering, you agree to our terms and conditions.
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
