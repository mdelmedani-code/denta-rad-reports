import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const Contact = () => {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Get Started Today
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Ready to access expert CBCT reporting? Register your interest or contact us for more information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6 animate-slide-up">
            <Card className="bg-gradient-card border-silver/20 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Mail className="w-5 h-5 mr-2" />
                  Email Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">referrals@dentarad.co.uk</p>
                <p className="text-sm text-muted-foreground">For case referrals and urgent queries</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-silver/20 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Clock className="w-5 h-5 mr-2" />
                  Response Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">Standard: 3-5 working days</p>
                <p className="text-muted-foreground mb-2">Priority: 24 hours (+£50)</p>
                <p className="text-sm text-muted-foreground">Reports delivered via secure portal</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-silver/20 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <MapPin className="w-5 h-5 mr-2" />
                  Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">UK-wide service</p>
                <p className="text-sm text-muted-foreground">Secure portal access from anywhere</p>
              </CardContent>
            </Card>
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-2 animate-scale-in">
            <Card className="bg-gradient-card border-silver/20 shadow-medium">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">
                  Register Your Interest
                </CardTitle>
                <p className="text-muted-foreground">
                  Get access to our secure referral portal and start receiving expert CBCT reports
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Dr. John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Smith" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john.smith@dentalclinic.co.uk" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+44 20 7XXX XXXX" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="practice">Practice Name</Label>
                  <Input id="practice" placeholder="Your Dental Practice" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volume">Expected Monthly Volume</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="message">Additional Information (Optional)</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Any specific requirements or questions..."
                    rows={3}
                  />
                </div>

                <Button variant="premium" size="lg" className="w-full text-lg py-6 h-auto">
                  Register for Access
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By registering, you agree to our terms and conditions. We'll contact you within 24 hours to set up your secure portal access.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;