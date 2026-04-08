export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          event: string;
          ip: string | null;
          user_agent: string | null;
          headers: Json;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event: string;
          ip?: string | null;
          user_agent?: string | null;
          headers?: Json;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event?: string;
          ip?: string | null;
          user_agent?: string | null;
          headers?: Json;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          university: string;
          graduation_year: number;
          major: string;
          skills: Json;
          experience: Json;
          target_industries: Json;
          target_roles: Json;
          resume_text: string;
          referral_code: string | null;
          company_unlocks: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email?: string | null;
          university?: string;
          graduation_year: number;
          major: string;
          skills?: Json;
          experience?: Json;
          target_industries?: Json;
          target_roles?: Json;
          resume_text?: string;
          referral_code?: string | null;
          company_unlocks?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          university?: string;
          graduation_year?: number;
          major?: string;
          skills?: Json;
          experience?: Json;
          target_industries?: Json;
          target_roles?: Json;
          resume_text?: string;
          referral_code?: string | null;
          company_unlocks?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      funnel_states: {
        Row: {
          user_id: string;
          xp: number;
          level: number;
          level_name: string;
          streak: number;
          badges: Json;
          recent_actions: Json;
          stages: Json;
          total_outreach_done: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          xp?: number;
          level?: number;
          level_name?: string;
          streak?: number;
          badges?: Json;
          recent_actions?: Json;
          stages?: Json;
          total_outreach_done?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          xp?: number;
          level?: number;
          level_name?: string;
          streak?: number;
          badges?: Json;
          recent_actions?: Json;
          stages?: Json;
          total_outreach_done?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      connections: {
        Row: {
          id: string;
          user_id: string;
          alumni_id: string;
          alumni_name: string;
          alumni_role: string;
          alumni_email: string | null;
          alumni_linkedin_url: string;
          company_id: string;
          company_name: string;
          stage: string;
          notes_summary: Json | null;
          sent_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          alumni_id: string;
          alumni_name: string;
          alumni_role: string;
          alumni_email?: string | null;
          alumni_linkedin_url: string;
          company_id: string;
          company_name: string;
          stage?: string;
          notes_summary?: Json | null;
          sent_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          alumni_id?: string;
          alumni_name?: string;
          alumni_role?: string;
          alumni_email?: string | null;
          alumni_linkedin_url?: string;
          company_id?: string;
          company_name?: string;
          stage?: string;
          notes_summary?: Json | null;
          sent_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      selected_companies: {
        Row: {
          user_id: string;
          company_id: string;
          company_data: Json;
          created_at: string;
        };
        Insert: {
          user_id: string;
          company_id: string;
          company_data: Json;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          company_id?: string;
          company_data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
