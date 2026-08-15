export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          plan: 'free' | 'pro'
          subscription_status: 'inactive' | 'trialing' | 'active' | 'expired' | 'cancelled'
          trial_ends_at: string | null
          subscription_started_at: string | null
          subscription_expires_at: string | null
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
          plan?: 'free' | 'pro'
          subscription_status?: 'inactive' | 'trialing' | 'active' | 'expired' | 'cancelled'
          trial_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_expires_at?: string | null
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
          plan?: 'free' | 'pro'
          subscription_status?: 'inactive' | 'trialing' | 'active' | 'expired' | 'cancelled'
          trial_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_expires_at?: string | null
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
          completion_key: string | null
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
          completion_key?: string | null
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
          completion_key?: string | null
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
          confidence: number
          points_awarded: number | null
          scored_at: string | null
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
          confidence?: number
          points_awarded?: number | null
          scored_at?: string | null
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
          confidence?: number
          points_awarded?: number | null
          scored_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      prediction_fixtures: {
        Row: {
          fixture_id: string
          league_key: 'premier-league' | 'la-liga' | 'ligue-1'
          league_name: string
          gameweek_key: string
          home_team: string
          away_team: string
          kickoff_at: string
          status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
          home_score: number | null
          away_score: number | null
          is_derby: boolean
          scoring_completed_at: string | null
          source_updated_at: string
          created_at: string
        }
        Insert: {
          fixture_id: string
          league_key: 'premier-league' | 'la-liga' | 'ligue-1'
          league_name: string
          gameweek_key: string
          home_team: string
          away_team: string
          kickoff_at: string
          status?: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
          home_score?: number | null
          away_score?: number | null
          is_derby?: boolean
          scoring_completed_at?: string | null
          source_updated_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['prediction_fixtures']['Insert']>
        Relationships: []
      }
      prediction_leagues: {
        Row: {
          id: string
          league_code: string
          name: string
          owner_user_id: string
          rule_mode: 'all' | 'random_1' | 'random_5'
          league_keys: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          league_code: string
          name: string
          owner_user_id: string
          rule_mode?: 'all' | 'random_1' | 'random_5'
          league_keys?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['prediction_leagues']['Insert']>
        Relationships: []
      }
      prediction_league_members: {
        Row: { league_id: string; user_id: string; role: 'owner' | 'member'; joined_at: string }
        Insert: { league_id: string; user_id: string; role?: 'owner' | 'member'; joined_at?: string }
        Update: { league_id?: string; user_id?: string; role?: 'owner' | 'member'; joined_at?: string }
        Relationships: []
      }
      prediction_league_fixtures: {
        Row: { league_id: string; fixture_id: string; gameweek_key: string; created_at: string }
        Insert: { league_id: string; fixture_id: string; gameweek_key: string; created_at?: string }
        Update: { league_id?: string; fixture_id?: string; gameweek_key?: string; created_at?: string }
        Relationships: []
      }
      prediction_perfect_week_rewards: {
        Row: { user_id: string; gameweek_key: string; credits_awarded: number; awarded_at: string }
        Insert: { user_id: string; gameweek_key: string; credits_awarded?: number; awarded_at?: string }
        Update: { user_id?: string; gameweek_key?: string; credits_awarded?: number; awarded_at?: string }
        Relationships: []
      }
      prediction_player_settings: {
        Row: { user_id: string; country_code: string | null; continent_code: string | null; share_location: boolean; updated_at: string }
        Insert: { user_id: string; country_code?: string | null; continent_code?: string | null; share_location?: boolean; updated_at?: string }
        Update: { user_id?: string; country_code?: string | null; continent_code?: string | null; share_location?: boolean; updated_at?: string }
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
          age: number | null
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
          is_trade_locked: boolean
          trade_lock_reason: string | null
          trade_lock_started_at: string | null
          trade_lock_ends_at: string | null
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
          age?: number | null
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
          is_trade_locked?: boolean
          trade_lock_reason?: string | null
          trade_lock_started_at?: string | null
          trade_lock_ends_at?: string | null
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
          age?: number | null
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
          is_trade_locked?: boolean
          trade_lock_reason?: string | null
          trade_lock_started_at?: string | null
          trade_lock_ends_at?: string | null
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
      beta_join: {
        Args: {
          p_source?: string
        }
        Returns: Record<string, unknown>
      }
      beta_my_status: {
        Args: Record<string, never>
        Returns: Record<string, unknown>
      }
      complete_quiz: {
        Args: {
          p_quiz_id: string
          p_score: number
          p_total: number
          p_xp: number
          p_completion_key: string
        }
        Returns: {
          awarded: boolean
          already_processed: boolean
          completion_key: string
          activity_date: string
        }
      }
      set_profile_username: {
        Args: {
          p_username: string
        }
        Returns: {
          id: string
          username: string | null
        }[]
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
      market_app_portfolio_snapshot: {
        Args: Record<string, never>
        Returns: Record<string, unknown>
      }
      market_import_guest_squad: {
        Args: {
          p_player_slugs: string[]
          p_watchlist_slugs?: string[]
        }
        Returns: Record<string, unknown>
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
      prediction_create_league: {
        Args: { p_name: string; p_rule_mode: string; p_league_keys: string[] }
        Returns: Record<string, unknown>
      }
      prediction_join_league: {
        Args: { p_league_code: string }
        Returns: Record<string, unknown>
      }
      prediction_leave_league: {
        Args: { p_league_id: string }
        Returns: Record<string, unknown>
      }
      prediction_save_picks: {
        Args: { p_picks: Array<{ fixture_id: string; pick: 'home' | 'draw' | 'away'; confidence: number }> }
        Returns: Record<string, unknown>
      }
      prediction_get_public_leaderboard: {
        Args: { p_period?: string; p_scope?: string; p_scope_value?: string | null }
        Returns: Array<{ user_id: string; username: string; points: number; picks_scored: number; correct_picks: number; confidence_won: number; last_scored_at: string }>
      }
      prediction_get_league_leaderboard: {
        Args: { p_league_id: string }
        Returns: Array<{ user_id: string; username: string; points: number; picks_scored: number; correct_picks: number; rank: number }>
      }
      prediction_set_location: {
        Args: { p_country_code: string; p_continent_code: string; p_share_location: boolean }
        Returns: Record<string, unknown>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
