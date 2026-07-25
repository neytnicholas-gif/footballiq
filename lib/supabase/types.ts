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
          quizzes_completed: number
          correct_answers: number
          total_answers: number
          perfect_quizzes: number
          current_streak: number
          longest_streak: number
          last_activity_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          rating?: number
          xp?: number
          streak?: number
          quizzes_completed?: number
          correct_answers?: number
          total_answers?: number
          perfect_quizzes?: number
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          rating?: number
          xp?: number
          streak?: number
          quizzes_completed?: number
          correct_answers?: number
          total_answers?: number
          perfect_quizzes?: number
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          id: number
          user_id: string
          quiz_id: string
          score: number
          total: number
          xp_earned: number
          attempt_id: string | null
          activity_date: string | null
          completed_at: string
        }
        Insert: {
          id?: number
          user_id: string
          quiz_id: string
          score: number
          total: number
          xp_earned?: number
          attempt_id?: string | null
          activity_date?: string | null
          completed_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          quiz_id?: string
          score?: number
          total?: number
          xp_earned?: number
          attempt_id?: string | null
          activity_date?: string | null
          completed_at?: string
        }
        Relationships: []
      }
      quiz_progress: {
        Row: {
          user_id: string
          quiz_id: string
          current_index: number
          score: number
          total: number
          progress: Record<string, unknown>
          status: 'in_progress' | 'completed'
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          quiz_id: string
          current_index?: number
          score?: number
          total?: number
          progress?: Record<string, unknown>
          status?: 'in_progress' | 'completed'
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          quiz_id?: string
          current_index?: number
          score?: number
          total?: number
          progress?: Record<string, unknown>
          status?: 'in_progress' | 'completed'
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: number
          user_id: string
          prediction_set: string
          fixture_id: string
          home_team: string
          away_team: string
          pick: 'home' | 'draw' | 'away'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          prediction_set: string
          fixture_id: string
          home_team: string
          away_team: string
          pick: 'home' | 'draw' | 'away'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          prediction_set?: string
          fixture_id?: string
          home_team?: string
          away_team?: string
          pick?: 'home' | 'draw' | 'away'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mode_stats: {
        Row: {
          user_id: string
          mode: string
          rating: number
          xp: number
          quizzes_completed: number
          correct_answers: number
          total_answers: number
          perfect_quizzes: number
          best_score: number
          updated_at: string
        }
        Insert: {
          user_id: string
          mode: string
          rating?: number
          xp?: number
          quizzes_completed?: number
          correct_answers?: number
          total_answers?: number
          perfect_quizzes?: number
          best_score?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          mode?: string
          rating?: number
          xp?: number
          quizzes_completed?: number
          correct_answers?: number
          total_answers?: number
          perfect_quizzes?: number
          best_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      season_stats: {
        Row: {
          user_id: string
          season_id: string
          rating: number
          xp: number
          quizzes_completed: number
          correct_answers: number
          total_answers: number
          perfect_quizzes: number
          updated_at: string
        }
        Insert: {
          user_id: string
          season_id: string
          rating?: number
          xp?: number
          quizzes_completed?: number
          correct_answers?: number
          total_answers?: number
          perfect_quizzes?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          season_id?: string
          rating?: number
          xp?: number
          quizzes_completed?: number
          correct_answers?: number
          total_answers?: number
          perfect_quizzes?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_leaderboard_profiles: {
        Row: {
          id: string
          username: string
          rating: number
          xp: number
          quizzes_completed: number
          correct_answers: number
          total_answers: number
          perfect_quizzes: number
          current_streak: number
          longest_streak: number
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      public_leaderboard_quiz_results: {
        Row: {
          user_id: string
          quiz_id: string
          score: number
          total: number
          xp_earned: number
          activity_date: string | null
          completed_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Functions: {
      complete_quiz: {
        Args: {
          p_quiz_id: string
          p_score: number
          p_total: number
          p_xp: number
          p_activity_date: string
          p_attempt_id?: string | null
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
