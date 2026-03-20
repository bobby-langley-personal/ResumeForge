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
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
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
      applications: {
        Row: {
          id: string
          user_id: string
          resume_id: string | null
          job_title: string
          company: string
          job_description: string
          resume_content: string | null
          cover_letter_content: string | null
          status: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
          application_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resume_id?: string | null
          job_title: string
          company: string
          job_description: string
          resume_content?: string | null
          cover_letter_content?: string | null
          status?: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
          application_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resume_id?: string | null
          job_title?: string
          company?: string
          job_description?: string
          resume_content?: string | null
          cover_letter_content?: string | null
          status?: 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'
          application_date?: string
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