-- Create incident/breach register table
CREATE TABLE public.data_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reported_by UUID REFERENCES auth.users(id),
  
  -- Incident details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_type TEXT NOT NULL DEFAULT 'other',
  data_categories TEXT[] DEFAULT '{}',
  individuals_affected INTEGER DEFAULT 0,
  
  -- Risk assessment
  risk_level TEXT NOT NULL DEFAULT 'low',
  risk_assessment TEXT,
  
  -- Actions taken
  containment_actions TEXT,
  remediation_actions TEXT,
  
  -- Notification tracking
  ico_notification_required BOOLEAN DEFAULT false,
  ico_notified_at TIMESTAMP WITH TIME ZONE,
  ico_reference TEXT,
  individuals_notified BOOLEAN DEFAULT false,
  individuals_notified_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_incidents ENABLE ROW LEVEL SECURITY;

-- Only admins can manage incidents
CREATE POLICY "Admins can manage data incidents"
  ON public.data_incidents
  FOR ALL
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Create updated_at trigger
CREATE TRIGGER update_data_incidents_updated_at
  BEFORE UPDATE ON public.data_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for 72-hour deadline tracking
CREATE INDEX idx_data_incidents_deadline ON public.data_incidents(discovered_at) 
  WHERE ico_notification_required = true AND ico_notified_at IS NULL;