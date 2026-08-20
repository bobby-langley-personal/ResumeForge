export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      api_logs: {
        Row: {
          id: string
          user_id: string | null
          route: string
          method: string
          status_code: number | null
          request_body: Json | null
          response_summary: Json | null
          error: string | null
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          route: string
          method?: string
          status_code?: number | null
          request_body?: Json | null
          response_summary?: Json | null
          error?: string | null
          duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          route?: string
          method?: string
          status_code?: number | null
          request_body?: Json | null
          response_summary?: Json | null
          error?: string | null
          duration_ms?: number | null
          created_at?: string
        }
        Relationships: []
      }
      ext_logs: {
        Row: {
          id: string
          user_id: string | null
          event: string
          platform: string | null
          method: string | null
          severity: string
          payload: Json | null
          ext_version: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event: string
          platform?: string | null
          method?: string | null
          severity?: string
          payload?: Json | null
          ext_version?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event?: string
          platform?: string | null
          method?: string | null
          severity?: string
          payload?: Json | null
          ext_version?: string | null
          created_at?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          id: string
          api_name: string
          month: string
          call_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          api_name: string
          month: string
          call_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          api_name?: string
          month?: string
          call_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          type: 'general' | 'bug'
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'general' | 'bug'
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'general' | 'bug'
          message?: string
          created_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          user_id: string
          full_name: string
          email: string
          location: string
          linkedin_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          full_name?: string
          email?: string
          location?: string
          linkedin_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          full_name?: string
          email?: string
          location?: string
          linkedin_url?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          notification_type: 'setup_experience' | 'first_tailor' | 'add_more_experience' | 'job_hunt_checkin' | 'try_extension'
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notification_type: 'setup_experience' | 'first_tailor' | 'add_more_experience' | 'job_hunt_checkin' | 'try_extension'
          sent_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notification_type?: 'setup_experience' | 'first_tailor' | 'add_more_experience' | 'job_hunt_checkin' | 'try_extension'
          sent_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          stripe_customer_id: string | null
          subscription_status: 'free' | 'pro' | 'canceled' | null
          subscription_period_end: string | null
          tailored_resume_count: number
          has_used_extension: boolean
          email_unsubscribed: boolean
          do_not_email: boolean
          chat_unlocked_count: number
          interview_prep_count: number
          experience_interview_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          stripe_customer_id?: string | null
          subscription_status?: 'free' | 'pro' | 'canceled' | null
          subscription_period_end?: string | null
          tailored_resume_count?: number
          has_used_extension?: boolean
          email_unsubscribed?: boolean
          do_not_email?: boolean
          chat_unlocked_count?: number
          interview_prep_count?: number
          experience_interview_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          stripe_customer_id?: string | null
          subscription_status?: 'free' | 'pro' | 'canceled' | null
          subscription_period_end?: string | null
          tailored_resume_count?: number
          has_used_extension?: boolean
          email_unsubscribed?: boolean
          do_not_email?: boolean
          chat_unlocked_count?: number
          interview_prep_count?: number
          experience_interview_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: Json
          item_type: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: Json
          item_type?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: Json
          item_type?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_events: {
        Row: {
          id: string
          user_id: string | null
          event: string
          properties: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event: string
          properties?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event?: string
          properties?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          id: string
          user_id: string
          status: 'draft' | 'complete'
          completed_roles: Json
          draft_state: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'draft' | 'complete'
          completed_roles?: Json
          draft_state?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'draft' | 'complete'
          completed_roles?: Json
          draft_state?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          user_id: string
          source_resume_id: string | null
          job_title: string
          company: string
          job_description: string
          job_url: string | null
          resume_content: string | null
          cover_letter_content: string | null
          status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
          fit_analysis: unknown | null
          questions: unknown | null
          question_answers: unknown | null
          interview_prep: unknown | null
          chat_history: unknown | null
          chat_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_resume_id?: string | null
          job_title: string
          company: string
          job_description: string
          job_url?: string | null
          resume_content?: string | null
          cover_letter_content?: string | null
          status?: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
          fit_analysis?: unknown | null
          questions?: unknown | null
          question_answers?: unknown | null
          interview_prep?: unknown | null
          chat_history?: unknown | null
          chat_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_resume_id?: string | null
          job_title?: string
          company?: string
          job_description?: string
          job_url?: string | null
          resume_content?: string | null
          cover_letter_content?: string | null
          status?: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
          fit_analysis?: unknown | null
          questions?: unknown | null
          question_answers?: unknown | null
          interview_prep?: unknown | null
          chat_history?: unknown | null
          chat_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          }
        ]
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