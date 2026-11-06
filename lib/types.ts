export type Industry =
  | "law_firm"
  | "accounting"
  | "consulting"
  | "hospitality"
  | "retail"
  | "healthcare"
  | "logistics"
  | "ecommerce"
  | "architecture"
  | "agriculture"
  | "recruitment"
  | "real_estate"
  | "sales"
  | "marketing"
  | "customer_service"
  | "administration"
  | "operations"
  | "management"
  | "oil_gas"
  | "blue_collar"
  | "other";

export type LeadStage =
  | "prospect"
  | "contacted"
  | "replied"
  | "meeting"
  | "client"
  | "disqualified"
  | "unreachable";

export type InteractionType =
  | "whatsapp_sent"
  | "whatsapp_reply"
  | "call"
  | "email"
  | "note";

export type MessageStage =
  | "initial"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "breakup"
  | "re_engagement";

export interface Company {
  id: string;
  name: string;
  normalized_name: string;
  industry: Industry | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  google_place_id: string | null;
  size: string | null;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  company_id: string | null;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  is_decision_maker: boolean;
  notes: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  stage: LeadStage;
  source: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  priority: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: InteractionType;
  message_content: string | null;
  sent_at: string | null;
  replied_at: string | null;
  reply_content: string | null;
  notes: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  lead_id: string | null;
  stage: MessageStage;
  variant: string | null;
  content: string;
  generated_at: string;
}

export interface SavedSearch {
  id: string;
  label: string;
  industry: Industry | null;
  city: string | null;
  keywords: string[];
  is_active: boolean;
  created_at: string;
}

export interface IngestionRun {
  id: string;
  source: string;
  started_at: string;
  finished_at: string;
  fetched_count: number;
  inserted_count: number;
  duplicate_count: number;
  error: string | null;
  created_at: string;
}