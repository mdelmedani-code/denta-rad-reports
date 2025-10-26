import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { logAudit } from "@/lib/auditLog";

interface Clinic {
  id: string;
  name: string;
  contact_email: string;
}

interface UnbilledCase {
  id: string;
  patient_name: string;
  field_of_view: string;
  urgency: string;
  created_at: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  case_id?: string;
}

export default function CreateInvoicePage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [unbilledCases, setUnbilledCases] = useState<UnbilledCase[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(
    format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [taxRate, setTaxRate] = useState(20);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/admin/login");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      });
      navigate("/reporter");
    }
  };

  useEffect(() => {
    checkAdminAccess();
    fetchClinics();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      fetchUnbilledCases(selectedClinic);
    }
  }, [selectedClinic]);

  const fetchClinics = async () => {
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name, contact_email")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setClinics(data || []);
  };

  const fetchUnbilledCases = async (clinicId: string) => {
    const { data, error } = await supabase
      .from("cases")
      .select("id, patient_name, field_of_view, urgency, created_at")
      .eq("clinic_id", clinicId)
      .eq("status", "report_ready")
      .or("billed.is.null,billed.eq.false")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setUnbilledCases(data || []);
  };

  const getPriceForCase = async (fieldOfView: string, urgency: string): Promise<number> => {
    const { data, error } = await supabase.rpc('calculate_case_price', {
      p_field_of_view: fieldOfView as any,
      p_urgency: urgency as any,
      p_addons: []
    });

    if (error) {
      console.error('Error calculating price:', error);
      return 125; // Default price
    }

    return Number(data) || 125;
  };

  const handleLoadCases = async () => {
    if (unbilledCases.length === 0) {
      toast({
        title: "No Cases",
        description: "No unbilled cases found for this clinic.",
        variant: "destructive",
      });
      return;
    }

    const items: LineItem[] = await Promise.all(
      unbilledCases.map(async (caseData) => {
        const price = await getPriceForCase(caseData.field_of_view, caseData.urgency);
        return {
          description: `CBCT Report - ${caseData.patient_name} (${caseData.field_of_view})`,
          quantity: 1,
          unit_price: price,
          total: price,
          case_id: caseData.id,
        };
      })
    );

    setLineItems(items);

    toast({
      title: "Cases Loaded",
      description: `${items.length} cases added to invoice.`,
    });
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price: 0, total: 0 },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "unit_price") {
      updated[index].total =
        updated[index].quantity * updated[index].unit_price;
    }

    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreateInvoice = async () => {
    if (!selectedClinic) {
      toast({
        title: "Validation Error",
        description: "Please select a clinic.",
        variant: "destructive",
      });
      return;
    }

    if (lineItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create invoice (using type assertion due to outdated types)
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices" as any)
        .insert({
          clinic_id: selectedClinic,
          issue_date: issueDate,
          due_date: dueDate,
          tax_rate: taxRate,
          status: "draft",
          notes: notes,
          created_by: user?.id,
        })
        .select()
        .single() as any;

      if (invoiceError) throw invoiceError;

      // Create line items
      const items = lineItems.map((item, index) => ({
        invoice_id: invoice.id,
        case_id: item.case_id || null,
        line_number: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items" as any)
        .insert(items);

      if (itemsError) throw itemsError;

      // Mark cases as billed if they were loaded
      const casesToBill = lineItems.filter(item => item.case_id).map(item => item.case_id);
      if (casesToBill.length > 0) {
        const { error: updateError } = await supabase
          .from("cases")
          .update({
            billed: true,
            billed_at: new Date().toISOString(),
            invoice_id: invoice.id,
          })
          .in("id", casesToBill);

        if (updateError) throw updateError;
      }

      await logAudit({
        action: "invoice_created",
        resourceType: "invoice",
        resourceId: invoice.id,
        details: {
          invoice_number: invoice.invoice_number,
          clinic_id: selectedClinic,
          total: calculateTotal(),
          line_items_count: lineItems.length,
        },
      });

      toast({
        title: "Success",
        description: `Invoice ${invoice.invoice_number} created successfully.`,
      });

      navigate("/admin/invoices");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/invoices")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Invoice</h1>
          <p className="text-muted-foreground mt-1">
            Generate a new invoice for a clinic
          </p>
        </div>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clinic">Clinic *</Label>
              <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unbilled Cases</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLoadCases}
                disabled={!selectedClinic}
              >
                Load Cases ({unbilledCases.length})
              </Button>
            </div>

            <div>
              <Label htmlFor="issue-date">Issue Date</Label>
              <Input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button size="sm" onClick={handleAddLineItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No line items yet. Click "Add Item" or "Load Cases" to get started.
            </div>
          ) : (
            lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      handleUpdateLineItem(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateLineItem(index, "quantity", Number(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={item.unit_price}
                    onChange={(e) =>
                      handleUpdateLineItem(
                        index,
                        "unit_price",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={`£${item.total.toFixed(2)}`}
                    disabled
                  />
                </div>
                <div className="col-span-1 flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLineItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {lineItems.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">
                  £{calculateSubtotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxRate}%):</span>
                <span className="font-medium">
                  £{calculateTax().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>£{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional notes or payment terms..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/invoices")}
        >
          Cancel
        </Button>
        <Button onClick={handleCreateInvoice} disabled={loading}>
          {loading ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </div>
  );
}
