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
    // TODO: wire to backend
    setSubmitted(true);
    toast({
      title: "Interest registered",
      description: "We'll be in touch within 24 hours.",
    });
  };

  return (
    <section id="register" className="py-16 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
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
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <Mail className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">Email</p>
                <p className="text-muted-foreground text-sm">
                  info@dentarad.co.uk
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <Clock className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Turnaround
                </p>
                <p className="text-muted-foreground text-sm">
                  Standard: 2-3 working days
                </p>
                <p className="text-muted-foreground text-sm">
                  Priority: 24 hours
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card">
              <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Coverage
                </p>
                <p className="text-muted-foreground text-sm">
                  UK-wide teleradiology service
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <Card className="border-accent/30">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle2 className="w-16 h-16 text-accent mb-4" />
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
              <Card className="border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-foreground">
                    Practice Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="Dr. John"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm">
                          Last Name
                        </Label>
                        <Input id="lastName" placeholder="Smith" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john.smith@dentalclinic.co.uk"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+44 20 7XXX XXXX"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="practice" className="text-sm">
                        Practice Name
                      </Label>
                      <Input
                        id="practice"
                        placeholder="Your Dental Practice"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="volume" className="text-sm">
                        Expected Monthly Volume
                      </Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expected volume" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-5">
                            1-5 scans per month
                          </SelectItem>
                          <SelectItem value="6-15">
                            6-15 scans per month
                          </SelectItem>
                          <SelectItem value="16-30">
                            16-30 scans per month
                          </SelectItem>
                          <SelectItem value="30+">
                            30+ scans per month
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-sm">
                        Additional Information{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Any specific requirements or questions..."
                        rows={3}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
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
