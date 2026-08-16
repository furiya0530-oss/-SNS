/**
 * supabase/migrations/ のスキーマに対応する型定義。
 *
 * `supabase gen types typescript --linked > src/types/database.ts` で
 * 生成できる形に合わせてあるので、CLI を使えるようになったら
 * このファイルをそのまま上書きすればよい。
 *
 * Insert / Update は SQL 側の列単位の権限に合わせてある。
 * 例えば profiles の plan はユーザー本人が更新できないため、
 * Insert / Update の候補に含めていない。
 */

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
      profiles: {
        Row: {
          id: string
          name: string | null
          role: Database['public']['Enums']['user_role']
          plan: Database['public']['Enums']['plan_type']
          plan_expires_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
        }
        // grant insert (id, name) — plan は既定値の 'free' で作られる
        Insert: {
          id: string
          name?: string | null
        }
        // grant update (name) — role / plan / Stripe 関連は service_role のみ
        Update: {
          name?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          owner_id: string
          name: string
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          address?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          address?: string | null
        }
        Relationships: []
      }
      items: {
        Row: {
          id: string
          property_id: string
          name: string
          category: string | null
          quantity: number
          threshold: number
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          name: string
          category?: string | null
          quantity?: number
          threshold?: number
          photo_url?: string | null
        }
        Update: {
          name?: string
          category?: string | null
          quantity?: number
          threshold?: number
          photo_url?: string | null
        }
        Relationships: []
      }
      checklists: {
        Row: {
          id: string
          property_id: string
          title: string
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          title: string
          created_at?: string
        }
        Update: {
          title?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          id: string
          checklist_id: string
          item_id: string | null
          label: string
        }
        Insert: {
          id?: string
          checklist_id: string
          item_id?: string | null
          label: string
        }
        Update: {
          item_id?: string | null
          label?: string
        }
        Relationships: []
      }
      checklist_records: {
        Row: {
          id: string
          checklist_id: string
          property_id: string
          performed_by: string
          performed_at: string
        }
        // performed_by は既定値が auth.uid() なので省略できる
        Insert: {
          id?: string
          checklist_id: string
          property_id: string
          performed_by?: string
          performed_at?: string
        }
        Update: {
          performed_at?: string
        }
        Relationships: []
      }
      checklist_record_details: {
        Row: {
          id: string
          checklist_record_id: string
          checklist_item_id: string
          status: Database['public']['Enums']['checklist_status']
          comment: string | null
        }
        Insert: {
          id?: string
          checklist_record_id: string
          checklist_item_id: string
          status: Database['public']['Enums']['checklist_status']
          comment?: string | null
        }
        Update: {
          status?: Database['public']['Enums']['checklist_status']
          comment?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      is_property_owner: {
        Args: { p_property_id: string }
        Returns: boolean
      }
      is_checklist_owner: {
        Args: { p_checklist_id: string }
        Returns: boolean
      }
      is_checklist_item_owner: {
        Args: { p_checklist_item_id: string }
        Returns: boolean
      }
      is_checklist_record_owner: {
        Args: { p_checklist_record_id: string }
        Returns: boolean
      }
      import_items: {
        Args: { p_rows: Json }
        Returns: Json
      }
      submit_checklist_record: {
        Args: {
          p_checklist_id: string
          p_property_id: string
          p_details: Json
        }
        Returns: string
      }
    }
    Enums: {
      plan_type: 'free' | 'pro'
      user_role: 'owner' | 'staff'
      checklist_status: 'ok' | 'short' | 'broken'
    }
    CompositeTypes: Record<never, never>
  }
}
