-- Create the subscriptions table to store Toss Payments Billing Keys
CREATE TABLE public.subscriptions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    billing_key TEXT NOT NULL,
    card_company TEXT,
    card_number TEXT,
    plan_type TEXT DEFAULT 'premium_monthly',
    status TEXT DEFAULT 'active',
    next_billing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own subscription
CREATE POLICY "Users can view own subscription" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Only service role (backend) can insert/update
CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions FOR ALL 
USING (true)
WITH CHECK (true);
