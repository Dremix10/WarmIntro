export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent: string
          claude_tokens_used: number | null
          duration_ms: number | null
          ended_at: string | null
          error: string | null
          id: string
          input_summary: Json | null
          output_summary: Json | null
          started_at: string
          triggered_by: string | null
          user_id: string | null
        }
        Insert: {
          agent: string
          claude_tokens_used?: number | null
          duration_ms?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          input_summary?: Json | null
          output_summary?: Json | null
          started_at?: string
          triggered_by?: string | null
          user_id?: string | null
        }
        Update: {
          agent?: string
          claude_tokens_used?: number | null
          duration_ms?: number | null
          ended_at?: string | null
          error?: string | null
          id?: string
          input_summary?: Json | null
          output_summary?: Json | null
          started_at?: string
          triggered_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banker_deals: {
        Row: {
          acquirer_company: string | null
          added_at: string
          banker_id: string | null
          closed_on: string | null
          confidence: number
          deal_name: string
          description: string | null
          id: string
          source: string | null
          target_company: string | null
          value_usd: number | null
        }
        Insert: {
          acquirer_company?: string | null
          added_at?: string
          banker_id?: string | null
          closed_on?: string | null
          confidence?: number
          deal_name: string
          description?: string | null
          id?: string
          source?: string | null
          target_company?: string | null
          value_usd?: number | null
        }
        Update: {
          acquirer_company?: string | null
          added_at?: string
          banker_id?: string | null
          closed_on?: string | null
          confidence?: number
          deal_name?: string
          description?: string | null
          id?: string
          source?: string | null
          target_company?: string | null
          value_usd?: number | null
        }
        Relationships: []
      }
      banker_profiles: {
        Row: {
          about_section: string | null
          banker_id: string
          certifications: Json
          education: Json
          interests: string[]
          languages: string[]
          past_positions: Json
          recent_deals_mentioned: Json
          recent_posts: Json
          scrape_source: string | null
          scraped_at: string | null
          volunteering: Json
        }
        Insert: {
          about_section?: string | null
          banker_id: string
          certifications?: Json
          education?: Json
          interests?: string[]
          languages?: string[]
          past_positions?: Json
          recent_deals_mentioned?: Json
          recent_posts?: Json
          scrape_source?: string | null
          scraped_at?: string | null
          volunteering?: Json
        }
        Update: {
          about_section?: string | null
          banker_id?: string
          certifications?: Json
          education?: Json
          interests?: string[]
          languages?: string[]
          past_positions?: Json
          recent_deals_mentioned?: Json
          recent_posts?: Json
          scrape_source?: string | null
          scraped_at?: string | null
          volunteering?: Json
        }
        Relationships: []
      }
      bankers: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean
          firm_id: string | null
          grad_year: number | null
          group_id: string | null
          id: string
          linkedin_url: string | null
          name: string
          seniority: string | null
          source: string | null
          title: string
          university: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          firm_id?: string | null
          grad_year?: number | null
          group_id?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          seniority?: string | null
          source?: string | null
          title: string
          university?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_verified?: boolean
          firm_id?: string | null
          grad_year?: number | null
          group_id?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          seniority?: string | null
          source?: string | null
          title?: string
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          alumni_email: string | null
          alumni_id: string
          alumni_linkedin_url: string
          alumni_name: string
          alumni_role: string
          banker_id: string | null
          company_id: string
          company_name: string
          id: string
          last_send_message_id: string | null
          needs_followup: boolean
          notes_summary: Json | null
          sent_at: string
          silence_days: number
          stage: string
          thread_id: string | null
          updated_at: string
          user_id: string
          warmth: number | null
        }
        Insert: {
          alumni_email?: string | null
          alumni_id: string
          alumni_linkedin_url: string
          alumni_name: string
          alumni_role: string
          banker_id?: string | null
          company_id: string
          company_name: string
          id?: string
          last_send_message_id?: string | null
          needs_followup?: boolean
          notes_summary?: Json | null
          sent_at?: string
          silence_days?: number
          stage?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
          warmth?: number | null
        }
        Update: {
          alumni_email?: string | null
          alumni_id?: string
          alumni_linkedin_url?: string
          alumni_name?: string
          alumni_role?: string
          banker_id?: string | null
          company_id?: string
          company_name?: string
          id?: string
          last_send_message_id?: string | null
          needs_followup?: boolean
          notes_summary?: Json | null
          sent_at?: string
          silence_days?: number
          stage?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
          warmth?: number | null
        }
        Relationships: []
      }
      critic_calibration: {
        Row: {
          axis_correlations: Json
          bucket_stats: Json
          computed_at: string
          id: string
          notes: string | null
          version: number
        }
        Insert: {
          axis_correlations: Json
          bucket_stats: Json
          computed_at?: string
          id?: string
          notes?: string | null
          version: number
        }
        Update: {
          axis_correlations?: Json
          bucket_stats?: Json
          computed_at?: string
          id?: string
          notes?: string | null
          version?: number
        }
        Relationships: []
      }
      critic_reviews: {
        Row: {
          created_at: string
          draft_id: string
          feedback: string | null
          id: string
          overall_score: number
          scores: Json
          suggested_revision: string | null
          verdict: string
        }
        Insert: {
          created_at?: string
          draft_id: string
          feedback?: string | null
          id?: string
          overall_score: number
          scores: Json
          suggested_revision?: string | null
          verdict: string
        }
        Update: {
          created_at?: string
          draft_id?: string
          feedback?: string | null
          id?: string
          overall_score?: number
          scores?: Json
          suggested_revision?: string | null
          verdict?: string
        }
        Relationships: []
      }
      demo_sessions: {
        Row: {
          categories: Json | null
          created_at: string
          graduation_year: number | null
          id: string
          major: string | null
          name: string | null
          people_found: Json | null
          resume_text: string | null
          skills: Json | null
          target_industries: Json | null
          target_roles: Json | null
          university: string | null
        }
        Insert: {
          categories?: Json | null
          created_at?: string
          graduation_year?: number | null
          id?: string
          major?: string | null
          name?: string | null
          people_found?: Json | null
          resume_text?: string | null
          skills?: Json | null
          target_industries?: Json | null
          target_roles?: Json | null
          university?: string | null
        }
        Update: {
          categories?: Json | null
          created_at?: string
          graduation_year?: number | null
          id?: string
          major?: string | null
          name?: string | null
          people_found?: Json | null
          resume_text?: string | null
          skills?: Json | null
          target_industries?: Json | null
          target_roles?: Json | null
          university?: string | null
        }
        Relationships: []
      }
      drafts: {
        Row: {
          banker_id: string | null
          body: string
          connection_id: string | null
          created_at: string
          critic_review_id: string | null
          fact_check: Json | null
          guardrail_flags: Json
          critic_override: boolean
          id: string
          iteration_count: number
          pre_edit_ai_body: string | null
          scheduled_send_at: string | null
          sent_at: string | null
          sent_message_id: string | null
          status: string
          subject: string | null
          type: string
          updated_at: string
          user_edited_body: string | null
          user_id: string
        }
        Insert: {
          banker_id?: string | null
          body: string
          connection_id?: string | null
          created_at?: string
          critic_override?: boolean
          critic_review_id?: string | null
          fact_check?: Json | null
          guardrail_flags?: Json
          id?: string
          iteration_count?: number
          pre_edit_ai_body?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          sent_message_id?: string | null
          status?: string
          subject?: string | null
          type: string
          updated_at?: string
          user_edited_body?: string | null
          user_id: string
        }
        Update: {
          banker_id?: string | null
          body?: string
          connection_id?: string | null
          created_at?: string
          critic_override?: boolean
          critic_review_id?: string | null
          fact_check?: Json | null
          guardrail_flags?: Json
          id?: string
          iteration_count?: number
          pre_edit_ai_body?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          sent_message_id?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
          user_edited_body?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          event: string
          id: string
          ip: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      firms: {
        Row: {
          created_at: string
          domain: string
          hq_city: string | null
          id: string
          logo_url: string | null
          name: string
          tier: string
        }
        Insert: {
          created_at?: string
          domain: string
          hq_city?: string | null
          id: string
          logo_url?: string | null
          name: string
          tier: string
        }
        Update: {
          created_at?: string
          domain?: string
          hq_city?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          tier?: string
        }
        Relationships: []
      }
      flywheel_releases: {
        Row: {
          changes: Json
          critic_calibration_version: number | null
          headline: string
          id: string
          published_at: string
          scoring_weights_version: number | null
          week_of: string
        }
        Insert: {
          changes: Json
          critic_calibration_version?: number | null
          headline: string
          id?: string
          published_at?: string
          scoring_weights_version?: number | null
          week_of: string
        }
        Update: {
          changes?: Json
          critic_calibration_version?: number | null
          headline?: string
          id?: string
          published_at?: string
          scoring_weights_version?: number | null
          week_of?: string
        }
        Relationships: []
      }
      funnel_states: {
        Row: {
          badges: Json
          level: number
          level_name: string
          recent_actions: Json
          stages: Json
          streak: number
          total_outreach_done: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          badges?: Json
          level?: number
          level_name?: string
          recent_actions?: Json
          stages?: Json
          streak?: number
          total_outreach_done?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          badges?: Json
          level?: number
          level_name?: string
          recent_actions?: Json
          stages?: Json
          streak?: number
          total_outreach_done?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      groups: {
        Row: {
          firm_id: string
          id: string
          kind: string | null
          name: string
          parent_group_id: string | null
        }
        Insert: {
          firm_id: string
          id: string
          kind?: string | null
          name: string
          parent_group_id?: string | null
        }
        Update: {
          firm_id?: string
          id?: string
          kind?: string | null
          name?: string
          parent_group_id?: string | null
        }
        Relationships: []
      }
      pilot_signups: {
        Row: {
          created_at: string
          email: string
          graduation_year: number | null
          id: string
          major: string | null
          name: string | null
          resume_text: string | null
          skills: Json | null
          target_industries: Json | null
          university: string | null
        }
        Insert: {
          created_at?: string
          email: string
          graduation_year?: number | null
          id?: string
          major?: string | null
          name?: string | null
          resume_text?: string | null
          skills?: Json | null
          target_industries?: Json | null
          university?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          graduation_year?: number | null
          id?: string
          major?: string | null
          name?: string | null
          resume_text?: string | null
          skills?: Json | null
          target_industries?: Json | null
          university?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_unlocks: number
          created_at: string
          email: string | null
          experience: Json
          gmail_access_token_encrypted: string | null
          gmail_connected_at: string | null
          gmail_email: string | null
          gmail_refresh_token_encrypted: string | null
          gmail_scopes: string[] | null
          gmail_token_expires_at: string | null
          graduation_year: number
          id: string
          major: string
          name: string
          referral_code: string | null
          resume_text: string
          skills: Json
          story_one_liner: string | null
          target_firms: string[]
          target_groups: string[]
          target_industries: Json
          target_roles: Json
          university: string
          updated_at: string
          warm_hints: string[]
        }
        Insert: {
          company_unlocks?: number
          created_at?: string
          email?: string | null
          experience?: Json
          gmail_access_token_encrypted?: string | null
          gmail_connected_at?: string | null
          gmail_email?: string | null
          gmail_refresh_token_encrypted?: string | null
          gmail_scopes?: string[] | null
          gmail_token_expires_at?: string | null
          graduation_year: number
          id: string
          major: string
          name: string
          referral_code?: string | null
          resume_text?: string
          skills?: Json
          story_one_liner?: string | null
          target_firms?: string[]
          target_groups?: string[]
          target_industries?: Json
          target_roles?: Json
          university?: string
          updated_at?: string
          warm_hints?: string[]
        }
        Update: {
          company_unlocks?: number
          created_at?: string
          email?: string | null
          experience?: Json
          gmail_access_token_encrypted?: string | null
          gmail_connected_at?: string | null
          gmail_email?: string | null
          gmail_refresh_token_encrypted?: string | null
          gmail_scopes?: string[] | null
          gmail_token_expires_at?: string | null
          graduation_year?: number
          id?: string
          major?: string
          name?: string
          referral_code?: string | null
          resume_text?: string
          skills?: Json
          story_one_liner?: string | null
          target_firms?: string[]
          target_groups?: string[]
          target_industries?: Json
          target_roles?: Json
          university?: string
          updated_at?: string
          warm_hints?: string[]
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      schema_proposals: {
        Row: {
          change_type: string
          created_at: string
          executed_at: string | null
          id: string
          proposed_by: string
          rationale: string
          reviewed_at: string | null
          reviewed_by: string | null
          sql: string
          status: string
        }
        Insert: {
          change_type: string
          created_at?: string
          executed_at?: string | null
          id?: string
          proposed_by?: string
          rationale: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sql: string
          status?: string
        }
        Update: {
          change_type?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          proposed_by?: string
          rationale?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sql?: string
          status?: string
        }
        Relationships: []
      }
      scoring_weights: {
        Row: {
          id: string
          is_active: boolean
          produced_at: string
          produced_by: string
          version: number
          weights: Json
        }
        Insert: {
          id?: string
          is_active?: boolean
          produced_at?: string
          produced_by?: string
          version: number
          weights: Json
        }
        Update: {
          id?: string
          is_active?: boolean
          produced_at?: string
          produced_by?: string
          version?: number
          weights?: Json
        }
        Relationships: []
      }
      selected_companies: {
        Row: {
          company_data: Json
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          company_data: Json
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          company_data?: Json
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          agent: string | null
          banker_id: string | null
          connection_id: string | null
          draft_id: string | null
          id: string
          metadata: Json
          occurred_at: string
          signal_type: string
          user_id: string | null
        }
        Insert: {
          agent?: string | null
          banker_id?: string | null
          connection_id?: string | null
          draft_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          signal_type: string
          user_id?: string | null
        }
        Update: {
          agent?: string | null
          banker_id?: string | null
          connection_id?: string | null
          draft_id?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          signal_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trust_levels: {
        Row: {
          approvals_count_followup: number
          approvals_count_new: number
          approvals_count_reply: number
          auto_graduate: boolean
          daily_batch_size: number
          night_preview_enabled: boolean
          preferred_send_time: string
          preferred_timezone: string
          send_followup: string
          send_new_email: string
          send_reply: string
          stops_count: number
          tomorrow_override: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approvals_count_followup?: number
          approvals_count_new?: number
          approvals_count_reply?: number
          auto_graduate?: boolean
          daily_batch_size?: number
          night_preview_enabled?: boolean
          preferred_send_time?: string
          preferred_timezone?: string
          send_followup?: string
          send_new_email?: string
          send_reply?: string
          stops_count?: number
          tomorrow_override?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approvals_count_followup?: number
          approvals_count_new?: number
          approvals_count_reply?: number
          auto_graduate?: boolean
          daily_batch_size?: number
          night_preview_enabled?: boolean
          preferred_send_time?: string
          preferred_timezone?: string
          send_followup?: string
          send_new_email?: string
          send_reply?: string
          stops_count?: number
          tomorrow_override?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
