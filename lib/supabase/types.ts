export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          rating: number
          xp: number
          streak: number
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          rating?: number
          xp?: number
          streak?: number
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          rating?: number
          xp?: number
          streak?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
