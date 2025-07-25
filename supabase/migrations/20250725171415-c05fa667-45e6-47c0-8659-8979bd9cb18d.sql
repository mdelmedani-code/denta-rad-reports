-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('clinic', 'admin');

-- Create case status enum
CREATE TYPE public.case_status AS ENUM ('uploaded', 'in_progress', 'report_ready', 'awaiting_payment');

-- Create field of view enum
CREATE TYPE public.field_of_view AS ENUM ('small', 'large');

-- Create urgency enum
CREATE TYPE public.urgency_level AS ENUM ('standard', 'urgent');

-- Create clinics table
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'clinic',
  clinic_id UUID REFERENCES public.clinics(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cases table
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  patient_name TEXT NOT NULL,
  patient_dob DATE,
  patient_internal_id TEXT,
  clinical_question TEXT NOT NULL,
  field_of_view field_of_view NOT NULL DEFAULT 'small',
  urgency urgency_level NOT NULL DEFAULT 'standard',
  status case_status NOT NULL DEFAULT 'uploaded',
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_path TEXT,
  report_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  report_text TEXT,
  pdf_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  billed BOOLEAN DEFAULT FALSE,
  billed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to get current user clinic
CREATE OR REPLACE FUNCTION public.get_current_user_clinic()
RETURNS UUID AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for clinics
CREATE POLICY "Clinics viewable by authenticated users" ON public.clinics
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

-- RLS Policies for cases
CREATE POLICY "Clinics can view own cases" ON public.cases
  FOR SELECT USING (clinic_id = public.get_current_user_clinic());

CREATE POLICY "Clinics can insert own cases" ON public.cases
  FOR INSERT WITH CHECK (clinic_id = public.get_current_user_clinic());

CREATE POLICY "Admins can view all cases" ON public.cases
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all cases" ON public.cases
  FOR UPDATE USING (public.get_current_user_role() = 'admin');

-- RLS Policies for reports
CREATE POLICY "Clinics can view reports for own cases" ON public.reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases 
      WHERE cases.id = reports.case_id 
      AND cases.clinic_id = public.get_current_user_clinic()
    )
  );

CREATE POLICY "Admins can manage all reports" ON public.reports
  FOR ALL USING (public.get_current_user_role() = 'admin');

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'clinic');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();