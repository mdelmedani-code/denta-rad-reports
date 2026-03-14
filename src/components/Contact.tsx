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
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [occupation, setOccupation] = useState("");
  const [volume, setVolume] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!occupation) {
      toast({ title: "Occupation is required", description: "Please select your occupation.", variant: "destructive" });
      return;
    }
    if (!volume) {
      toast({ title: "Volume is required", description: "Please select your expected monthly volume.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const form = e.target as HTMLFormElement;
    const formData = {
      title,
      firstName: (form.elements.namedItem("firstName") as HTMLInputElement).value,
      lastName: (form.elements.namedItem("lastName") as HTMLInputElement).value,
      occupation,
      practice: (form.elements.namedItem("practice") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      volume,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const { error } = await supabase.functions.invoke("register-interest", {
        body: formData,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Interest registered",
        description: "Thank you for registering. We'll be in touch soon.",
      });
    } catch (error) {
      console.error("Failed to send registration:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly at admin@dentarad.co.uk",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    { icon: Mail, title: "Email", lines: ["info@dentarad.co.uk"] },
  ];

  return (
    <section id="register" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-accent font-medium mb-3">Get Started</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight mb-3">
            Register Your Interest
          </h2>
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
                  Your interest has been registered. We'll be in touch soon to set up your portal access.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-sm">Title</Label>
                        <Select value={title} onValueChange={setTitle}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mr">Mr</SelectItem>
                            <SelectItem value="Mrs">Mrs</SelectItem>
                            <SelectItem value="Ms">Ms</SelectItem>
                            <SelectItem value="Miss">Miss</SelectItem>
                            <SelectItem value="Dr">Dr</SelectItem>
                            <SelectItem value="Prof">Prof</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm">First Name <span className="text-destructive">*</span></Label>
                        <Input id="firstName" placeholder="John" required maxLength={50} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm">Last Name <span className="text-destructive">*</span></Label>
                        <Input id="lastName" placeholder="Smith" required maxLength={50} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="occupation" className="text-sm">Occupation <span className="text-destructive">*</span></Label>
                      <Select value={occupation} onValueChange={setOccupation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your occupation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dentist">Dentist</SelectItem>
                          <SelectItem value="medical-doctor">Medical Doctor</SelectItem>
                          <SelectItem value="practice-manager">Practice Manager</SelectItem>
                          <SelectItem value="dental-nurse">Dental Nurse</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="practice" className="text-sm">Practice Name</Label>
                      <Input id="practice" placeholder="Your Practice/Clinic" maxLength={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm">Contact Number <span className="text-destructive">*</span></Label>
                      <Input id="phone" type="tel" placeholder="+44 7700 900000" required maxLength={25} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm">Email Address <span className="text-destructive">*</span></Label>
                      <Input id="email" type="email" placeholder="john.smith@dentalclinic.co.uk" required maxLength={255} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="volume" className="text-sm">Expected Monthly Volume <span className="text-destructive">*</span></Label>
                      <Select value={volume} onValueChange={setVolume}>
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
                      <Textarea id="message" placeholder="Any specific requirements or questions..." rows={3} maxLength={1000} />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-sm font-medium"
                    >
                      {isSubmitting ? "Submitting..." : "Register Interest"}
                    </Button>
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
