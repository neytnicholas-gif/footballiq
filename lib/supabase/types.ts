export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      market_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_catalogues: {
        Row: {
          activated_at: string | null
          approval_fingerprint: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          declaration_identities_resolved: boolean
          declaration_independently_selected: boolean
          declaration_manually_reviewed: boolean
          declaration_no_systematic_copy: boolean
          declaration_original_values: boolean
          fingerprint: string
          id: string
          manual_schema_version: number | null
          record_count: number
          rejected_count: number
          season_id: string
          source_reference: string | null
          source_type: string | null
          status: string
          unresolved_warning_count: number
          updated_at: string
          validated_at: string
          validation_error_count: number
        }
        Insert: {
          activated_at?: string | null
          approval_fingerprint?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          declaration_identities_resolved?: boolean
          declaration_independently_selected?: boolean
          declaration_manually_reviewed?: boolean
          declaration_no_systematic_copy?: boolean
          declaration_original_values?: boolean
          fingerprint: string
          id?: string
          manual_schema_version?: number | null
          record_count: number
          rejected_count?: number
          season_id: string
          source_reference?: string | null
          source_type?: string | null
          status: string
          unresolved_warning_count?: number
          updated_at?: string
          validated_at: string
          validation_error_count?: number
        }
        Update: {
          activated_at?: string | null
          approval_fingerprint?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          declaration_identities_resolved?: boolean
          declaration_independently_selected?: boolean
          declaration_manually_reviewed?: boolean
          declaration_no_systematic_copy?: boolean
          declaration_original_values?: boolean
          fingerprint?: string
          id?: string
          manual_schema_version?: number | null
          record_count?: number
          rejected_count?: number
          season_id?: string
          source_reference?: string | null
          source_type?: string | null
          status?: string
          unresolved_warning_count?: number
          updated_at?: string
          validated_at?: string
          validation_error_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_catalogues_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "market_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      market_clubs: {
        Row: {
          created_at: string
          data_updated_at: string | null
          id: string
          is_active: boolean
          name: string
          primary_colour: string
          provider_club_id: string
          season_id: string
          secondary_colour: string
          short_name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_updated_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          primary_colour: string
          provider_club_id: string
          season_id: string
          secondary_colour: string
          short_name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_updated_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          primary_colour?: string
          provider_club_id?: string
          season_id?: string
          secondary_colour?: string
          short_name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_clubs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "market_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      market_daily_limits: {
        Row: {
          activity_date: string
          created_at: string
          id: string
          portfolio_id: string
          purchases_count: number
          sales_count: number
          updated_at: string
        }
        Insert: {
          activity_date: string
          created_at?: string
          id?: string
          portfolio_id: string
          purchases_count?: number
          sales_count?: number
          updated_at?: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: string
          portfolio_id?: string
          purchases_count?: number
          sales_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_daily_limits_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "market_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      market_holdings: {
        Row: {
          current_value_minor: number
          id: string
          player_id: string
          portfolio_id: string
          purchase_price_minor: number
          purchased_at: string
          quantity: number
          unrealised_profit_minor: number
          updated_at: string
        }
        Insert: {
          current_value_minor?: number
          id?: string
          player_id: string
          portfolio_id: string
          purchase_price_minor: number
          purchased_at?: string
          quantity?: number
          unrealised_profit_minor?: number
          updated_at?: string
        }
        Update: {
          current_value_minor?: number
          id?: string
          player_id?: string
          portfolio_id?: string
          purchase_price_minor?: number
          purchased_at?: string
          quantity?: number
          unrealised_profit_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_holdings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "market_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "market_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      market_import_logs: {
        Row: {
          dry_run: boolean
          error_count: number
          finished_at: string | null
          id: string
          imported_count: number
          notes: Json | null
          operation: string
          season_key: string | null
          skipped_count: number
          source_provider: string
          started_at: string
          status: string
        }
        Insert: {
          dry_run?: boolean
          error_count?: number
          finished_at?: string | null
          id?: string
          imported_count?: number
          notes?: Json | null
          operation: string
          season_key?: string | null
          skipped_count?: number
          source_provider: string
          started_at?: string
          status?: string
        }
        Update: {
          dry_run?: boolean
          error_count?: number
          finished_at?: string | null
          id?: string
          imported_count?: number
          notes?: Json | null
          operation?: string
          season_key?: string | null
          skipped_count?: number
          source_provider?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      market_manual_value_requests: {
        Row: {
          admin_user_id: string
          created_at: string
          effective_at: string
          event_type: string
          expected_value_minor: number
          new_value_minor: number
          player_id: string
          private_justification: string
          request_id: string
          valuation_event_id: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          effective_at: string
          event_type: string
          expected_value_minor: number
          new_value_minor: number
          player_id: string
          private_justification: string
          request_id: string
          valuation_event_id?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          effective_at?: string
          event_type?: string
          expected_value_minor?: number
          new_value_minor?: number
          player_id?: string
          private_justification?: string
          request_id?: string
          valuation_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_manual_value_requests_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "market_admins"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "market_manual_value_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "market_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_manual_value_requests_valuation_event_id_fkey"
            columns: ["valuation_event_id"]
            isOneToOne: false
            referencedRelation: "market_valuation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      market_player_match_stats: {
        Row: {
          assists: number
          blocks: number
          clean_sheet: boolean
          clearances: number
          fixture_date: string
          goals: number
          goals_conceded: number
          home_or_away: string | null
          id: string
          imported_at: string
          interceptions: number
          key_passes: number
          minutes_played: number
          opponent_club_id: string | null
          own_goals: number
          pass_accuracy: number | null
          passes: number
          penalties_missed: number
          penalties_scored: number
          player_id: string
          provider_fixture_id: string
          provider_rating_milli: number | null
          provider_updated_at: string | null
          raw_provider_payload: Json | null
          red_cards: number
          saves: number
          shots: number
          shots_on_target: number
          started: boolean
          tackles: number
          valuation_processed_at: string | null
          yellow_cards: number
        }
        Insert: {
          assists?: number
          blocks?: number
          clean_sheet?: boolean
          clearances?: number
          fixture_date: string
          goals?: number
          goals_conceded?: number
          home_or_away?: string | null
          id?: string
          imported_at?: string
          interceptions?: number
          key_passes?: number
          minutes_played?: number
          opponent_club_id?: string | null
          own_goals?: number
          pass_accuracy?: number | null
          passes?: number
          penalties_missed?: number
          penalties_scored?: number
          player_id: string
          provider_fixture_id: string
          provider_rating_milli?: number | null
          provider_updated_at?: string | null
          raw_provider_payload?: Json | null
          red_cards?: number
          saves?: number
          shots?: number
          shots_on_target?: number
          started?: boolean
          tackles?: number
          valuation_processed_at?: string | null
          yellow_cards?: number
        }
        Update: {
          assists?: number
          blocks?: number
          clean_sheet?: boolean
          clearances?: number
          fixture_date?: string
          goals?: number
          goals_conceded?: number
          home_or_away?: string | null
          id?: string
          imported_at?: string
          interceptions?: number
          key_passes?: number
          minutes_played?: number
          opponent_club_id?: string | null
          own_goals?: number
          pass_accuracy?: number | null
          passes?: number
          penalties_missed?: number
          penalties_scored?: number
          player_id?: string
          provider_fixture_id?: string
          provider_rating_milli?: number | null
          provider_updated_at?: string | null
          raw_provider_payload?: Json | null
          red_cards?: number
          saves?: number
          shots?: number
          shots_on_target?: number
          started?: boolean
          tackles?: number
          valuation_processed_at?: string | null
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_player_match_stats_opponent_club_id_fkey"
            columns: ["opponent_club_id"]
            isOneToOne: false
            referencedRelation: "market_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "market_players"
            referencedColumns: ["id"]
          },
        ]
      }
      market_players: {
        Row: {
          availability_status: string
          catalogue_id: string | null
          club_id: string | null
          created_at: string
          current_price_minor: number
          data_updated_at: string | null
          date_of_birth: string | null
          detailed_position: string | null
          display_name: string
          full_name: string
          id: string
          initial_price_minor: number
          internal_player_id: string | null
          is_available: boolean
          latest_rating_milli: number | null
          nationality: string | null
          performance_bank_milli: number
          position_group: string | null
          provider_player_id: string | null
          season_id: string
          shirt_number: number | null
          slug: string
          source_reference: string | null
          source_type: string | null
          source_verified_at: string | null
          updated_at: string
        }
        Insert: {
          availability_status?: string
          catalogue_id?: string | null
          club_id?: string | null
          created_at?: string
          current_price_minor: number
          data_updated_at?: string | null
          date_of_birth?: string | null
          detailed_position?: string | null
          display_name: string
          full_name: string
          id?: string
          initial_price_minor: number
          internal_player_id?: string | null
          is_available?: boolean
          latest_rating_milli?: number | null
          nationality?: string | null
          performance_bank_milli?: number
          position_group?: string | null
          provider_player_id?: string | null
          season_id: string
          shirt_number?: number | null
          slug: string
          source_reference?: string | null
          source_type?: string | null
          source_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          availability_status?: string
          catalogue_id?: string | null
          club_id?: string | null
          created_at?: string
          current_price_minor?: number
          data_updated_at?: string | null
          date_of_birth?: string | null
          detailed_position?: string | null
          display_name?: string
          full_name?: string
          id?: string
          initial_price_minor?: number
          internal_player_id?: string | null
          is_available?: boolean
          latest_rating_milli?: number | null
          nationality?: string | null
          performance_bank_milli?: number
          position_group?: string | null
          provider_player_id?: string | null
          season_id?: string
          shirt_number?: number | null
          slug?: string
          source_reference?: string | null
          source_type?: string | null
          source_verified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_players_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "market_catalogues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "market_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "market_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      market_portfolios: {
        Row: {
          cash_balance_minor: number
          created_at: string
          current_holdings_value_minor: number
          id: string
          realised_profit_minor: number
          season_id: string
          starting_balance_minor: number
          total_portfolio_value_minor: number
          unrealised_profit_minor: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_balance_minor: number
          created_at?: string
          current_holdings_value_minor?: number
          id?: string
          realised_profit_minor?: number
          season_id: string
          starting_balance_minor: number
          total_portfolio_value_minor?: number
          unrealised_profit_minor?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_balance_minor?: number
          created_at?: string
          current_holdings_value_minor?: number
          id?: string
          realised_profit_minor?: number
          season_id?: string
          starting_balance_minor?: number
          total_portfolio_value_minor?: number
          unrealised_profit_minor?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_portfolios_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "market_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      market_processing_runs: {
        Row: {
          dry_run: boolean
          error_message: string | null
          finished_at: string | null
          id: string
          report: Json | null
          run_key: string
          run_type: string
          started_at: string
          status: string
        }
        Insert: {
          dry_run?: boolean
          error_message?: string | null
          finished_at?: string | null
          id?: string
          report?: Json | null
          run_key: string
          run_type: string
          started_at?: string
          status: string
        }
        Update: {
          dry_run?: boolean
          error_message?: string | null
          finished_at?: string | null
          id?: string
          report?: Json | null
          run_key?: string
          run_type?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      market_public_leaderboard: {
        Row: {
          calculated_at: string
          cash_balance_minor: number
          display_name: string
          holdings_value_minor: number
          portfolio_id: string
          realised_profit_minor: number
          return_basis_points: number
          season_id: string
          total_profit_minor: number
          total_wealth_minor: number
          unrealised_profit_minor: number
          weekly_change_minor: number
        }
        Insert: {
          calculated_at?: string
          cash_balance_minor: number
          display_name: string
          holdings_value_minor: number
          portfolio_id: string
          realised_profit_minor: number
          return_basis_points?: number
          season_id: string
          total_profit_minor: number
          total_wealth_minor: number
          unrealised_profit_minor: number
          weekly_change_minor?: number
        }
        Update: {
          calculated_at?: string
          cash_balance_minor?: number
          display_name?: string
          holdings_value_minor?: number
          portfolio_id?: string
          realised_profit_minor?: number
          return_basis_points?: number
          season_id?: string
          total_profit_minor?: number
          total_wealth_minor?: number
          unrealised_profit_minor?: number
          weekly_change_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_public_leaderboard_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: true
            referencedRelation: "market_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_public_leaderboard_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "market_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      market_seasons: {
        Row: {
          competition_key: string
          created_at: string
          data_updated_at: string | null
          ends_at: string
          id: string
          is_active: boolean
          name: string
          season_key: string
          starts_at: string
        }
        Insert: {
          competition_key: string
          created_at?: string
          data_updated_at?: string | null
          ends_at: string
          id: string
          is_active?: boolean
          name: string
          season_key: string
          starts_at: string
        }
        Update: {
          competition_key?: string
          created_at?: string
          data_updated_at?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          name?: string
          season_key?: string
          starts_at?: string
        }
        Relationships: []
      }
      market_settings: {
        Row: {
          active_catalogue_id: string | null
          active_season_id: string | null
          id: number
          maximum_daily_purchases: number
          maximum_daily_sales: number
          maximum_holdings: number
          maximum_weekly_price_change_minor: number
          minimum_minutes: number
          minimum_price_minor: number
          price_step_minor: number
          starting_balance_minor: number
          substitute_minimum_minutes: number
          universal_baseline_rating_milli: number
          updated_at: string
          valuation_calculation_version: string
          weekly_update_day: number
        }
        Insert: {
          active_catalogue_id?: string | null
          active_season_id?: string | null
          id?: number
          maximum_daily_purchases?: number
          maximum_daily_sales?: number
          maximum_holdings?: number
          maximum_weekly_price_change_minor?: number
          minimum_minutes?: number
          minimum_price_minor?: number
          price_step_minor?: number
          starting_balance_minor?: number
          substitute_minimum_minutes?: number
          universal_baseline_rating_milli?: number
          updated_at?: string
          valuation_calculation_version?: string
          weekly_update_day?: number
        }
        Update: {
          active_catalogue_id?: string | null
          active_season_id?: string | null
          id?: number
          maximum_daily_purchases?: number
          maximum_daily_sales?: number
          maximum_holdings?: number
          maximum_weekly_price_change_minor?: number
          minimum_minutes?: number
          minimum_price_minor?: number
          price_step_minor?: number
          starting_balance_minor?: number
          substitute_minimum_minutes?: number
          universal_baseline_rating_milli?: number
          updated_at?: string
          valuation_calculation_version?: string
          weekly_update_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_settings_active_catalogue_id_fkey"
            columns: ["active_catalogue_id"]
            isOneToOne: false
            referencedRelation: "market_catalogues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_settings_active_season_id_fkey"
            columns: ["active_season_id"]
            isOneToOne: false
            referencedRelation: "market_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      market_transactions: {
        Row: {
          balance_after_minor: number
          balance_before_minor: number
          created_at: string
          executed_price_minor: number
          holding_value_after_minor: number
          holding_value_before_minor: number
          id: string
          idempotency_key: string
          player_id: string
          portfolio_id: string
          transaction_type: string
        }
        Insert: {
          balance_after_minor: number
          balance_before_minor: number
          created_at?: string
          executed_price_minor: number
          holding_value_after_minor: number
          holding_value_before_minor: number
          id?: string
          idempotency_key: string
          player_id: string
          portfolio_id: string
          transaction_type: string
        }
        Update: {
          balance_after_minor?: number
          balance_before_minor?: number
          created_at?: string
          executed_price_minor?: number
          holding_value_after_minor?: number
          holding_value_before_minor?: number
          id?: string
          idempotency_key?: string
          player_id?: string
          portfolio_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "market_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "market_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      market_valuation_events: {
        Row: {
          bank_after_event_milli: number
          baseline_rating_milli: number
          calculation_version: string
          created_at: string
          effective_at: string
          event_type: string
          id: string
          idempotency_key: string
          match_stat_id: string | null
          new_price_minor: number
          player_id: string
          previous_bank_milli: number
          previous_price_minor: number
          price_change_minor: number
          rating_delta_milli: number
          rating_milli: number | null
          reason: string | null
        }
        Insert: {
          bank_after_event_milli: number
          baseline_rating_milli: number
          calculation_version: string
          created_at?: string
          effective_at: string
          event_type: string
          id?: string
          idempotency_key: string
          match_stat_id?: string | null
          new_price_minor: number
          player_id: string
          previous_bank_milli: number
          previous_price_minor: number
          price_change_minor: number
          rating_delta_milli: number
          rating_milli?: number | null
          reason?: string | null
        }
        Update: {
          bank_after_event_milli?: number
          baseline_rating_milli?: number
          calculation_version?: string
          created_at?: string
          effective_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          match_stat_id?: string | null
          new_price_minor?: number
          player_id?: string
          previous_bank_milli?: number
          previous_price_minor?: number
          price_change_minor?: number
          rating_delta_milli?: number
          rating_milli?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_valuation_events_match_stat_id_fkey"
            columns: ["match_stat_id"]
            isOneToOne: false
            referencedRelation: "market_player_match_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_valuation_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "market_players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stats: {
        Row: {
          appearances: number
          assists: number
          average_rating_milli: number | null
          clean_sheets: number
          goals: number
          minutes_played: number
          player_id: string
          rated_matches: number
          rating_sum_milli: number
          red_cards: number
          season_id: string
          source_through_at: string | null
          starts: number
          updated_at: string
          yellow_cards: number
        }
        Insert: {
          appearances?: number
          assists?: number
          average_rating_milli?: number | null
          clean_sheets?: number
          goals?: number
          minutes_played?: number
          player_id: string
          rated_matches?: number
          rating_sum_milli?: number
          red_cards?: number
          season_id: string
          source_through_at?: string | null
          starts?: number
          updated_at?: string
          yellow_cards?: number
        }
        Update: {
          appearances?: number
          assists?: number
          average_rating_milli?: number | null
          clean_sheets?: number
          goals?: number
          minutes_played?: number
          player_id?: string
          rated_matches?: number
          rating_sum_milli?: number
          red_cards?: number
          season_id?: string
          source_through_at?: string | null
          starts?: number
          updated_at?: string
          yellow_cards?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_season_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "market_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "market_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      market_activate_catalogue: {
        Args: { p_catalogue_id: string; p_fingerprint: string }
        Returns: undefined
      }
      market_admin_update_player_value: {
        Args: {
          p_admin_user_id: string
          p_effective_at: string
          p_event_type: string
          p_expected_current_value_minor: number
          p_internal_player_id: string
          p_new_value_minor: number
          p_private_justification: string
          p_request_id: string
        }
        Returns: Json
      }
      market_brussels_date: { Args: { p_at?: string }; Returns: string }
      market_buy_player: {
        Args: {
          p_expected_price_minor: number
          p_idempotency_key: string
          p_player_id: string
        }
        Returns: {
          balance_after_minor: number
          balance_before_minor: number
          created_at: string
          executed_price_minor: number
          holding_value_after_minor: number
          holding_value_before_minor: number
          id: string
          idempotency_key: string
          player_id: string
          portfolio_id: string
          transaction_type: string
        }
        SetofOptions: {
          from: "*"
          to: "market_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      market_create_or_get_portfolio: {
        Args: never
        Returns: {
          cash_balance_minor: number
          created_at: string
          current_holdings_value_minor: number
          id: string
          realised_profit_minor: number
          season_id: string
          starting_balance_minor: number
          total_portfolio_value_minor: number
          unrealised_profit_minor: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "market_portfolios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      market_get_portfolio_snapshot: { Args: never; Returns: Json }
      market_process_valuation_event: {
        Args: {
          p_bank_after_event_milli: number
          p_baseline_rating_milli: number
          p_calculation_version: string
          p_effective_at: string
          p_event_type: string
          p_idempotency_key: string
          p_match_stat_id: string
          p_new_price_minor: number
          p_player_id: string
          p_previous_bank_milli: number
          p_previous_price_minor: number
          p_price_change_minor: number
          p_rating_delta_milli: number
          p_rating_milli: number
          p_reason: string
        }
        Returns: {
          bank_after_event_milli: number
          baseline_rating_milli: number
          calculation_version: string
          created_at: string
          effective_at: string
          event_type: string
          id: string
          idempotency_key: string
          match_stat_id: string | null
          new_price_minor: number
          player_id: string
          previous_bank_milli: number
          previous_price_minor: number
          price_change_minor: number
          rating_delta_milli: number
          rating_milli: number | null
          reason: string | null
        }
        SetofOptions: {
          from: "*"
          to: "market_valuation_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      market_public_leaderboard_v1: {
        Args: never
        Returns: {
          calculated_at: string
          cash_balance_minor: number
          display_name: string
          holdings_value_minor: number
          realised_profit_minor: number
          return_basis_points: number
          total_profit_minor: number
          total_wealth_minor: number
          unrealised_profit_minor: number
          weekly_change_minor: number
        }[]
      }
      market_public_players_v1: {
        Args: never
        Returns: {
          availability_status: string
          current_value_minor: number
          display_name: string
          id: string
          internal_player_id: string
          value_updated_at: string
        }[]
      }
      market_public_value_history_v1: {
        Args: { p_player_id: string }
        Returns: {
          effective_at: string
          event_type: string
          player_id: string
          value_minor: number
        }[]
      }
      market_rebuild_leaderboard_values: { Args: never; Returns: undefined }
      market_recalculate_portfolio_totals: {
        Args: { p_portfolio_id: string }
        Returns: undefined
      }
      market_refresh_player_season_stats: {
        Args: { p_season_id: string }
        Returns: undefined
      }
      market_sell_player: {
        Args: { p_idempotency_key: string; p_player_id: string }
        Returns: {
          balance_after_minor: number
          balance_before_minor: number
          created_at: string
          executed_price_minor: number
          holding_value_after_minor: number
          holding_value_before_minor: number
          id: string
          idempotency_key: string
          player_id: string
          portfolio_id: string
          transaction_type: string
        }
        SetofOptions: {
          from: "*"
          to: "market_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      market_upsert_public_leaderboard_row: {
        Args: {
          p_display_name: string
          p_portfolio_id: string
          p_weekly_change_minor: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
