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
      market_players: {
        Row: {
          id: number
          slug: string
          display_name: string
          short_name: string | null
          club_name: string
          position: 'GK' | 'DEF' | 'MID' | 'FWD'
          nationality: string | null
          active: boolean
          current_value: number
          previous_value: number
          opening_season_value: number
          value_updated_at: string
          data_updated_at: string
          data_source_label: string
          source_reference: string | null
          provenance_status: string
          owner_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          slug: string
          display_name: string
          short_name?: string | null
          club_name: string
          position: 'GK' | 'DEF' | 'MID' | 'FWD'
          nationality?: string | null
          active?: boolean
          current_value: number
          previous_value: number
          opening_season_value: number
          value_updated_at?: string
          data_updated_at?: string
          data_source_label: string
          source_reference?: string | null
          provenance_status?: string
          owner_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          slug?: string
          display_name?: string
          short_name?: string | null
          club_name?: string
          position?: 'GK' | 'DEF' | 'MID' | 'FWD'
          nationality?: string | null
          active?: boolean
          current_value?: number
          previous_value?: number
          opening_season_value?: number
          value_updated_at?: string
          data_updated_at?: string
          data_source_label?: string
          source_reference?: string | null
          provenance_status?: string
          owner_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_season_stats: {
        Row: {
          id: number
          player_id: number
          season: string
          competition_label: string
          appearances: number | null
          starts: number | null
          minutes: number | null
          goals: number | null
          assists: number | null
          clean_sheets: number | null
          yellow_cards: number | null
          red_cards: number | null
          shots: number | null
          shots_on_target: number | null
          chances_created: number | null
          key_passes: number | null
          passes_completed: number | null
          pass_accuracy: number | null
          tackles: number | null
          interceptions: number | null
          clearances: number | null
          blocks: number | null
          saves: number | null
          goals_conceded: number | null
          expected_goals: number | null
          expected_assists: number | null
          average_rating: number | null
          data_source: string
          source_reference: string | null
          provenance_status: string
          owner_verified: boolean
          last_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          player_id: number
          season: string
          competition_label: string
          appearances?: number | null
          starts?: number | null
          minutes?: number | null
          goals?: number | null
          assists?: number | null
          clean_sheets?: number | null
          yellow_cards?: number | null
          red_cards?: number | null
          shots?: number | null
          shots_on_target?: number | null
          chances_created?: number | null
          key_passes?: number | null
          passes_completed?: number | null
          pass_accuracy?: number | null
          tackles?: number | null
          interceptions?: number | null
          clearances?: number | null
          blocks?: number | null
          saves?: number | null
          goals_conceded?: number | null
          expected_goals?: number | null
          expected_assists?: number | null
          average_rating?: number | null
          data_source: string
          source_reference?: string | null
          provenance_status?: string
          owner_verified?: boolean
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          player_id?: number
          season?: string
          competition_label?: string
          appearances?: number | null
          starts?: number | null
          minutes?: number | null
          goals?: number | null
          assists?: number | null
          clean_sheets?: number | null
          yellow_cards?: number | null
          red_cards?: number | null
          shots?: number | null
          shots_on_target?: number | null
          chances_created?: number | null
          key_passes?: number | null
          passes_completed?: number | null
          pass_accuracy?: number | null
          tackles?: number | null
          interceptions?: number | null
          clearances?: number | null
          blocks?: number | null
          saves?: number | null
          goals_conceded?: number | null
          expected_goals?: number | null
          expected_assists?: number | null
          average_rating?: number | null
          data_source?: string
          source_reference?: string | null
          provenance_status?: string
          owner_verified?: boolean
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_portfolios: {
        Row: {
          user_id: string
          available_balance: number
          starting_balance: number
          portfolio_value: number
          total_account_value: number
          realized_profit_loss: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          available_balance?: number
          starting_balance?: number
          portfolio_value?: number
          total_account_value?: number
          realized_profit_loss?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          available_balance?: number
          starting_balance?: number
          portfolio_value?: number
          total_account_value?: number
          realized_profit_loss?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_holdings: {
        Row: {
          id: number
          user_id: string
          player_id: number
          acquisition_value: number
          acquired_at: string
          current_value_snapshot: number
          unrealized_profit_loss: number
        }
        Insert: {
          id?: number
          user_id: string
          player_id: number
          acquisition_value: number
          acquired_at?: string
          current_value_snapshot: number
          unrealized_profit_loss?: number
        }
        Update: {
          id?: number
          user_id?: string
          player_id?: number
          acquisition_value?: number
          acquired_at?: string
          current_value_snapshot?: number
          unrealized_profit_loss?: number
        }
        Relationships: []
      }
      market_transactions: {
        Row: {
          id: number
          transaction_id: string
          user_id: string
          player_id: number
          transaction_type: 'buy' | 'sell'
          execution_value: number
          balance_before: number
          balance_after: number
          created_at: string
          trade_date_utc: string
          idempotency_key: string
        }
        Insert: {
          id?: number
          transaction_id?: string
          user_id: string
          player_id: number
          transaction_type: 'buy' | 'sell'
          execution_value: number
          balance_before: number
          balance_after: number
          created_at?: string
          trade_date_utc?: string
          idempotency_key: string
        }
        Update: {
          id?: number
          transaction_id?: string
          user_id?: string
          player_id?: number
          transaction_type?: 'buy' | 'sell'
          execution_value?: number
          balance_before?: number
          balance_after?: number
          created_at?: string
          trade_date_utc?: string
          idempotency_key?: string
        }
        Relationships: []
      }
      market_value_history: {
        Row: {
          id: number
          player_id: number
          value: number
          recorded_at: string
          reason_category: string
          methodology_version: string
          created_at: string
        }
        Insert: {
          id?: number
          player_id: number
          value: number
          recorded_at?: string
          reason_category: string
          methodology_version: string
          created_at?: string
        }
        Update: {
          id?: number
          player_id?: number
          value?: number
          recorded_at?: string
          reason_category?: string
          methodology_version?: string
          created_at?: string
        }
        Relationships: []
      }
      market_watchlist: {
        Row: {
          user_id: string
          player_id: number
          created_at: string
        }
        Insert: {
          user_id: string
          player_id: number
          created_at?: string
        }
        Update: {
          user_id?: string
          player_id?: number
          created_at?: string
        }
        Relationships: []
      }
      market_portfolio_snapshots: {
        Row: {
          user_id: string
          snapshot_date: string
          available_balance: number
          portfolio_value: number
          total_account_value: number
          created_at: string
        }
        Insert: {
          user_id: string
          snapshot_date: string
          available_balance: number
          portfolio_value: number
          total_account_value: number
          created_at?: string
        }
        Update: {
          user_id?: string
          snapshot_date?: string
          available_balance?: number
          portfolio_value?: number
          total_account_value?: number
          created_at?: string
        }
        Relationships: []
      }
      market_xp_events: {
        Row: {
          id: number
          user_id: string
          event_code: string
          xp_awarded: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          event_code: string
          xp_awarded: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          event_code?: string
          xp_awarded?: number
          created_at?: string
        }
        Relationships: []
      }
      market_settings: {
        Row: {
          singleton: boolean
          market_status: 'open' | 'updating' | 'paused'
          methodology_version: string
          last_market_update_at: string | null
          updated_at: string
        }
        Insert: {
          singleton?: boolean
          market_status?: 'open' | 'updating' | 'paused'
          methodology_version?: string
          last_market_update_at?: string | null
          updated_at?: string
        }
        Update: {
          singleton?: boolean
          market_status?: 'open' | 'updating' | 'paused'
          methodology_version?: string
          last_market_update_at?: string | null
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
      market_public_leaderboard: {
        Row: {
          user_id: string
          username: string
          total_account_value: number
          all_time_gain: number
          daily_gain: number
          weekly_gain: number
          monthly_gain: number
          season_gain: number
          daily_return_pct: number
          weekly_return_pct: number
          monthly_return_pct: number
          season_return_pct: number
          all_time_return_pct: number
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
      market_buy_player: {
        Args: {
          p_player_slug: string
          p_idempotency_key: string
        }
        Returns: Record<string, unknown>
      }
      market_sell_player: {
        Args: {
          p_player_slug: string
          p_idempotency_key: string
        }
        Returns: Record<string, unknown>
      }
      market_toggle_watchlist: {
        Args: {
          p_player_slug: string
        }
        Returns: Record<string, unknown>
      }
      market_refresh_my_portfolio: {
        Args: Record<string, never>
        Returns: undefined
      }
      market_admin_update_player_value: {
        Args: {
          p_player_slug: string
          p_new_value: number
          p_reason_category: string
          p_methodology_version: string
          p_apply?: boolean
        }
        Returns: Record<string, unknown>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
