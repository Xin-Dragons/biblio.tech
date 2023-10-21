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
      "**blacklist": {
        Row: {
          address: string
          created_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
        }
        Relationships: []
      }
      "**incinerator-settings": {
        Row: {
          collection: string
          created_at: string | null
          decimals: number | null
          token: string | null
          token_distro: string | null
          tokens_per_mint: number | null
          type: string
        }
        Insert: {
          collection: string
          created_at?: string | null
          decimals?: number | null
          token?: string | null
          token_distro?: string | null
          tokens_per_mint?: number | null
          type: string
        }
        Update: {
          collection?: string
          created_at?: string | null
          decimals?: number | null
          token?: string | null
          token_distro?: string | null
          tokens_per_mint?: number | null
          type?: string
        }
        Relationships: []
      }
      "**killswitch": {
        Row: {
          active: boolean | null
          app: string
        }
        Insert: {
          active?: boolean | null
          app: string
        }
        Update: {
          active?: boolean | null
          app?: string
        }
        Relationships: []
      }
      "**market-settings": {
        Row: {
          bases: string[] | null
          created_at: string | null
          name: string
          royalties: number | null
          royalties_destination: string | null
          token_address: string | null
          token_decimals: string | null
          traits: string[] | null
          wallet: string | null
        }
        Insert: {
          bases?: string[] | null
          created_at?: string | null
          name: string
          royalties?: number | null
          royalties_destination?: string | null
          token_address?: string | null
          token_decimals?: string | null
          traits?: string[] | null
          wallet?: string | null
        }
        Update: {
          bases?: string[] | null
          created_at?: string | null
          name?: string
          royalties?: number | null
          royalties_destination?: string | null
          token_address?: string | null
          token_decimals?: string | null
          traits?: string[] | null
          wallet?: string | null
        }
        Relationships: []
      }
      "**mintooor-project-settings": {
        Row: {
          config: Json | null
          created_at: string | null
          distro_wallet: string | null
          mint_proceeds: string | null
          name: string
          og_start: string | null
          public_start: string | null
          token_address: string | null
          wl_start: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          distro_wallet?: string | null
          mint_proceeds?: string | null
          name: string
          og_start?: string | null
          public_start?: string | null
          token_address?: string | null
          wl_start?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          distro_wallet?: string | null
          mint_proceeds?: string | null
          name?: string
          og_start?: string | null
          public_start?: string | null
          token_address?: string | null
          wl_start?: string | null
        }
        Relationships: []
      }
      "**mission-items": {
        Row: {
          created_at: string | null
          item: string
          name: string
          public_key: string | null
          winning_chance: number | null
        }
        Insert: {
          created_at?: string | null
          item: string
          name: string
          public_key?: string | null
          winning_chance?: number | null
        }
        Update: {
          created_at?: string | null
          item?: string
          name?: string
          public_key?: string | null
          winning_chance?: number | null
        }
        Relationships: []
      }
      "**mission-project-settings": {
        Row: {
          active: boolean | null
          created_at: string | null
          decimals: number | null
          emission: Json | null
          holding_wallet: string | null
          instaresolve: boolean | null
          level_trait: string | null
          main: string | null
          name: string
          token_address: string | null
          unstake_on_mission: boolean | null
          update_authority: string | null
          update_meta: boolean | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          decimals?: number | null
          emission?: Json | null
          holding_wallet?: string | null
          instaresolve?: boolean | null
          level_trait?: string | null
          main?: string | null
          name: string
          token_address?: string | null
          unstake_on_mission?: boolean | null
          update_authority?: string | null
          update_meta?: boolean | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          decimals?: number | null
          emission?: Json | null
          holding_wallet?: string | null
          instaresolve?: boolean | null
          level_trait?: string | null
          main?: string | null
          name?: string
          token_address?: string | null
          unstake_on_mission?: boolean | null
          update_authority?: string | null
          update_meta?: boolean | null
        }
        Relationships: []
      }
      "**mission-settings": {
        Row: {
          active_from: string | null
          boost_cost: number | null
          boost_winning_chance: number | null
          cost: number | null
          created_at: string | null
          duration: number | null
          level: number | null
          name: string
          prize: number | null
          title: string | null
          token_mint: string | null
          trait_prize: Json | null
          type: string
          winning_chance: number | null
        }
        Insert: {
          active_from?: string | null
          boost_cost?: number | null
          boost_winning_chance?: number | null
          cost?: number | null
          created_at?: string | null
          duration?: number | null
          level?: number | null
          name: string
          prize?: number | null
          title?: string | null
          token_mint?: string | null
          trait_prize?: Json | null
          type: string
          winning_chance?: number | null
        }
        Update: {
          active_from?: string | null
          boost_cost?: number | null
          boost_winning_chance?: number | null
          cost?: number | null
          created_at?: string | null
          duration?: number | null
          level?: number | null
          name?: string
          prize?: number | null
          title?: string | null
          token_mint?: string | null
          trait_prize?: Json | null
          type?: string
          winning_chance?: number | null
        }
        Relationships: []
      }
      "**renamooor-settings": {
        Row: {
          burn: number | null
          collection: string
          cost: number
          created_at: string | null
          proceeds_wallet: string | null
          token_address: string | null
          token_decimals: number | null
          update_authority: string | null
        }
        Insert: {
          burn?: number | null
          collection: string
          cost: number
          created_at?: string | null
          proceeds_wallet?: string | null
          token_address?: string | null
          token_decimals?: number | null
          update_authority?: string | null
        }
        Update: {
          burn?: number | null
          collection?: string
          cost?: number
          created_at?: string | null
          proceeds_wallet?: string | null
          token_address?: string | null
          token_decimals?: number | null
          update_authority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "**renamooor-settings_collection_fkey"
            columns: ["collection"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          }
        ]
      }
      "**rpc-providers": {
        Row: {
          active: boolean | null
          created_at: string | null
          provider: string | null
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          provider?: string | null
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          provider?: string | null
          url?: string
        }
        Relationships: []
      }
      "**scam-map": {
        Row: {
          legit: string
          scam: string
        }
        Insert: {
          legit: string
          scam: string
        }
        Update: {
          legit?: string
          scam?: string
        }
        Relationships: []
      }
      "**transactions": {
        Row: {
          address: string
          change_id: string | null
          collection: string | null
          created_at: string | null
          id: number
          pending: boolean
          ref_id: string | null
          sol: number | null
          success: boolean | null
          tickets: number | null
          tokens: number | null
          type: string | null
        }
        Insert: {
          address: string
          change_id?: string | null
          collection?: string | null
          created_at?: string | null
          id?: number
          pending?: boolean
          ref_id?: string | null
          sol?: number | null
          success?: boolean | null
          tickets?: number | null
          tokens?: number | null
          type?: string | null
        }
        Update: {
          address?: string
          change_id?: string | null
          collection?: string | null
          created_at?: string | null
          id?: number
          pending?: boolean
          ref_id?: string | null
          sol?: number | null
          success?: boolean | null
          tickets?: number | null
          tokens?: number | null
          type?: string | null
        }
        Relationships: []
      }
      "acid-monkeys-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "acid-monkeys-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "aliens-trippin-high-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "anon-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "anon-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      authenticatooor: {
        Row: {
          created_at: string | null
          holding: number | null
          profile_id: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          holding?: number | null
          profile_id: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          holding?: number | null
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "authenticatooor_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authenticatooor_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "authenticatooor-settings"
            referencedColumns: ["project"]
          }
        ]
      }
      "authenticatooor-collections": {
        Row: {
          collection_id: string
          created_at: string | null
          project_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          project_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "authenticatooor-collections_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authenticatooor-collections_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "authenticatooor-settings"
            referencedColumns: ["project"]
          }
        ]
      }
      "authenticatooor-roles": {
        Row: {
          created_at: string | null
          holding: number | null
          id: string
          project_id: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          holding?: number | null
          id?: string
          project_id?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          holding?: number | null
          id?: string
          project_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authenticatooor-roles_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "authenticatooor-settings"
            referencedColumns: ["project"]
          }
        ]
      }
      "authenticatooor-settings": {
        Row: {
          active: boolean | null
          admin_user: string | null
          created_at: string | null
          discord_id: string | null
          project: string
        }
        Insert: {
          active?: boolean | null
          admin_user?: string | null
          created_at?: string | null
          discord_id?: string | null
          project: string
        }
        Update: {
          active?: boolean | null
          admin_user?: string | null
          created_at?: string | null
          discord_id?: string | null
          project?: string
        }
        Relationships: [
          {
            foreignKeyName: "authenticatooor-settings_admin_user_fkey"
            columns: ["admin_user"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "badger-settings": {
        Row: {
          active: boolean | null
          collection: string | null
          created_at: string | null
          legacy_update_authority: string | null
          mint_cost: number | null
          name: string | null
          position: Json | null
          project: string
          subscription: number | null
          subscription_date: string | null
          symbol: string | null
          update_authority: string | null
        }
        Insert: {
          active?: boolean | null
          collection?: string | null
          created_at?: string | null
          legacy_update_authority?: string | null
          mint_cost?: number | null
          name?: string | null
          position?: Json | null
          project: string
          subscription?: number | null
          subscription_date?: string | null
          symbol?: string | null
          update_authority?: string | null
        }
        Update: {
          active?: boolean | null
          collection?: string | null
          created_at?: string | null
          legacy_update_authority?: string | null
          mint_cost?: number | null
          name?: string | null
          position?: Json | null
          project?: string
          subscription?: number | null
          subscription_date?: string | null
          symbol?: string | null
          update_authority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badger-settings_project_fkey"
            columns: ["project"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          }
        ]
      }
      badgers: {
        Row: {
          created_at: string | null
          diamond: boolean | null
          highest_rank: string | null
          image: string | null
          mythic: boolean | null
          nft: string | null
          number_held: number | null
          owner: string
          points: number | null
          project: string
          rank: number | null
          royalties: boolean | null
          tier: number | null
          total_royalties: number | null
          whale_level: number | null
        }
        Insert: {
          created_at?: string | null
          diamond?: boolean | null
          highest_rank?: string | null
          image?: string | null
          mythic?: boolean | null
          nft?: string | null
          number_held?: number | null
          owner: string
          points?: number | null
          project: string
          rank?: number | null
          royalties?: boolean | null
          tier?: number | null
          total_royalties?: number | null
          whale_level?: number | null
        }
        Update: {
          created_at?: string | null
          diamond?: boolean | null
          highest_rank?: string | null
          image?: string | null
          mythic?: boolean | null
          nft?: string | null
          number_held?: number | null
          owner?: string
          points?: number | null
          project?: string
          rank?: number | null
          royalties?: boolean | null
          tier?: number | null
          total_royalties?: number | null
          whale_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "badgers_nft_fkey"
            columns: ["nft"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          },
          {
            foreignKeyName: "badgers_owner_fkey"
            columns: ["owner"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "baked-beavers-missions": {
        Row: {
          boost: boolean | null
          claimed_at: string | null
          completed: boolean | null
          created_at: string | null
          duration: number | null
          id: number
          mint: string
          mission_started: string | null
          price: number | null
          success: boolean | null
          transaction_started: string | null
          type: string | null
          wallet: string
          winning_chance: number | null
        }
        Insert: {
          boost?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          mint: string
          mission_started?: string | null
          price?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet: string
          winning_chance?: number | null
        }
        Update: {
          boost?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          mint?: string
          mission_started?: string | null
          price?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet?: string
          winning_chance?: number | null
        }
        Relationships: []
      }
      barter: {
        Row: {
          created_at: string | null
          from: string
          nonce: string
          status: string
          to: string
        }
        Insert: {
          created_at?: string | null
          from: string
          nonce: string
          status?: string
          to: string
        }
        Update: {
          created_at?: string | null
          from?: string
          nonce?: string
          status?: string
          to?: string
        }
        Relationships: []
      }
      "barter-trades": {
        Row: {
          created_at: string | null
          id: string
          luts: string[] | null
          nonce: string
          offered: string[]
          offered_sol: number | null
          requested: string[]
          requested_sol: number | null
          tx: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          luts?: string[] | null
          nonce: string
          offered: string[]
          offered_sol?: number | null
          requested: string[]
          requested_sol?: number | null
          tx?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          luts?: string[] | null
          nonce?: string
          offered?: string[]
          offered_sol?: number | null
          requested?: string[]
          requested_sol?: number | null
          tx?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barter-trades_nonce_fkey"
            columns: ["nonce"]
            referencedRelation: "barter"
            referencedColumns: ["nonce"]
          }
        ]
      }
      biblio: {
        Row: {
          access_nft: string | null
          active: boolean | null
          created_at: string | null
          data: Json | null
          discord: string | null
          display_name: string | null
          expires: string | null
          id: string
          is_admin: boolean | null
          slug: string | null
          twitter: string | null
        }
        Insert: {
          access_nft?: string | null
          active?: boolean | null
          created_at?: string | null
          data?: Json | null
          discord?: string | null
          display_name?: string | null
          expires?: string | null
          id?: string
          is_admin?: boolean | null
          slug?: string | null
          twitter?: string | null
        }
        Update: {
          access_nft?: string | null
          active?: boolean | null
          created_at?: string | null
          data?: Json | null
          discord?: string | null
          display_name?: string | null
          expires?: string | null
          id?: string
          is_admin?: boolean | null
          slug?: string | null
          twitter?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblio_access_nft_fkey"
            columns: ["access_nft"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          }
        ]
      }
      "biblio-collections": {
        Row: {
          active: boolean | null
          collection: string
          created_at: string | null
          hours_active: number | null
          number_wallets: number | null
        }
        Insert: {
          active?: boolean | null
          collection: string
          created_at?: string | null
          hours_active?: number | null
          number_wallets?: number | null
        }
        Update: {
          active?: boolean | null
          collection?: string
          created_at?: string | null
          hours_active?: number | null
          number_wallets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "biblio-collections_collection_fkey"
            columns: ["collection"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          }
        ]
      }
      "biblio-nfts": {
        Row: {
          biblio_id: string | null
          id: string
          mint: string | null
          staked_at: string | null
          unstaked_at: string | null
        }
        Insert: {
          biblio_id?: string | null
          id?: string
          mint?: string | null
          staked_at?: string | null
          unstaked_at?: string | null
        }
        Update: {
          biblio_id?: string | null
          id?: string
          mint?: string | null
          staked_at?: string | null
          unstaked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblio-nfts_biblio_id_fkey"
            columns: ["biblio_id"]
            referencedRelation: "biblio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblio-nfts_mint_fkey"
            columns: ["mint"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          }
        ]
      }
      "biblio-wallets": {
        Row: {
          active: boolean | null
          chain: string | null
          created_at: string | null
          ledger: boolean | null
          main: boolean | null
          public_key: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          chain?: string | null
          created_at?: string | null
          ledger?: boolean | null
          main?: boolean | null
          public_key: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          chain?: string | null
          created_at?: string | null
          ledger?: boolean | null
          main?: boolean | null
          public_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblio-wallets_public_key_fkey"
            columns: ["public_key"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          },
          {
            foreignKeyName: "biblio-wallets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "biblio"
            referencedColumns: ["id"]
          }
        ]
      }
      "bong-heads-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "bounty-balance": {
        Row: {
          created_at: string | null
          id: string
          tokens: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tokens?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      "bounty-hunters-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "bounty-hunters-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "bounty-transactions": {
        Row: {
          address: string | null
          created_at: string
          id: string
          pending: boolean | null
          ref_id: string
          success: boolean | null
          tokens: number
          txn_id: string | null
          type: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id: string
          pending?: boolean | null
          ref_id: string
          success?: boolean | null
          tokens: number
          txn_id?: string | null
          type: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          pending?: boolean | null
          ref_id?: string
          success?: boolean | null
          tokens?: number
          txn_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bounty-transactions_ref_id_fkey"
            columns: ["ref_id"]
            referencedRelation: "bounty-balance"
            referencedColumns: ["id"]
          }
        ]
      }
      claims: {
        Row: {
          address: string
          change_id: string | null
          collection: string
          created_at: string | null
          id: number
          mint: string | null
          pending: boolean
          ref_id: string | null
          sol: number | null
          success: boolean | null
          tokens: number | null
          transaction_started: string | null
          type: string | null
        }
        Insert: {
          address: string
          change_id?: string | null
          collection: string
          created_at?: string | null
          id?: number
          mint?: string | null
          pending?: boolean
          ref_id?: string | null
          sol?: number | null
          success?: boolean | null
          tokens?: number | null
          transaction_started?: string | null
          type?: string | null
        }
        Update: {
          address?: string
          change_id?: string | null
          collection?: string
          created_at?: string | null
          id?: number
          mint?: string | null
          pending?: boolean
          ref_id?: string | null
          sol?: number | null
          success?: boolean | null
          tokens?: number | null
          transaction_started?: string | null
          type?: string | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          collection: string | null
          created_at: string | null
          description: string | null
          disable_royalty_checking: boolean | null
          first_verified_creators: string[] | null
          hello_moon_collection_id: string | null
          id: string
          image: string | null
          name: string | null
          needs_review: boolean | null
          poll_meta: boolean | null
          poll_mints: boolean | null
          poll_unstaked: boolean | null
          project: string | null
          started_parsing: string | null
          symbol: string | null
          type: string | null
          update_authority: string | null
        }
        Insert: {
          collection?: string | null
          created_at?: string | null
          description?: string | null
          disable_royalty_checking?: boolean | null
          first_verified_creators?: string[] | null
          hello_moon_collection_id?: string | null
          id: string
          image?: string | null
          name?: string | null
          needs_review?: boolean | null
          poll_meta?: boolean | null
          poll_mints?: boolean | null
          poll_unstaked?: boolean | null
          project?: string | null
          started_parsing?: string | null
          symbol?: string | null
          type?: string | null
          update_authority?: string | null
        }
        Update: {
          collection?: string | null
          created_at?: string | null
          description?: string | null
          disable_royalty_checking?: boolean | null
          first_verified_creators?: string[] | null
          hello_moon_collection_id?: string | null
          id?: string
          image?: string | null
          name?: string | null
          needs_review?: boolean | null
          poll_meta?: boolean | null
          poll_mints?: boolean | null
          poll_unstaked?: boolean | null
          project?: string | null
          started_parsing?: string | null
          symbol?: string | null
          type?: string | null
          update_authority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_project_fkey"
            columns: ["project"]
            referencedRelation: "project-settings"
            referencedColumns: ["name"]
          }
        ]
      }
      "cosmic-citizens-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "cpl-api-access": {
        Row: {
          active: boolean | null
          api_key: string | null
          client: string
          created_at: string | null
          disable_rate_limit: boolean | null
        }
        Insert: {
          active?: boolean | null
          api_key?: string | null
          client: string
          created_at?: string | null
          disable_rate_limit?: boolean | null
        }
        Update: {
          active?: boolean | null
          api_key?: string | null
          client?: string
          created_at?: string | null
          disable_rate_limit?: boolean | null
        }
        Relationships: []
      }
      "crazed-crooks-market-items": {
        Row: {
          created_at: string | null
          house_item: boolean | null
          id: string
          is_collection: boolean | null
          listed: boolean | null
          mint: string | null
          owner: string | null
          price: number | null
          purchase_txn: string | null
          quantity: number | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          house_item?: boolean | null
          id: string
          is_collection?: boolean | null
          listed?: boolean | null
          mint?: string | null
          owner?: string | null
          price?: number | null
          purchase_txn?: string | null
          quantity?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          house_item?: boolean | null
          id?: string
          is_collection?: boolean | null
          listed?: boolean | null
          mint?: string | null
          owner?: string | null
          price?: number | null
          purchase_txn?: string | null
          quantity?: number | null
          title?: string | null
        }
        Relationships: []
      }
      "crazed-crooks-missions": {
        Row: {
          change_id: string | null
          claimed_at: string | null
          completed: boolean | null
          created_at: string | null
          duration: number | null
          id: number
          item: string | null
          item_number: number | null
          item_public_key: string | null
          mints: string[]
          mission_started: string | null
          pending_item: string | null
          price: number | null
          prize: number | null
          success: boolean | null
          transaction_started: string | null
          type: string | null
          wallet: string
          winning_chance: number | null
        }
        Insert: {
          change_id?: string | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          item?: string | null
          item_number?: number | null
          item_public_key?: string | null
          mints: string[]
          mission_started?: string | null
          pending_item?: string | null
          price?: number | null
          prize?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet: string
          winning_chance?: number | null
        }
        Update: {
          change_id?: string | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          item?: string | null
          item_number?: number | null
          item_public_key?: string | null
          mints?: string[]
          mission_started?: string | null
          pending_item?: string | null
          price?: number | null
          prize?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet?: string
          winning_chance?: number | null
        }
        Relationships: []
      }
      "dandies-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "dandies-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          token_address: string | null
          token_decimals: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          token_address?: string | null
          token_decimals?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          token_address?: string | null
          token_decimals?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "dandy-bears-market-items": {
        Row: {
          created_at: string | null
          house_item: boolean | null
          id: string
          is_collection: boolean | null
          listed: boolean | null
          mint: string | null
          owner: string | null
          price: number | null
          purchase_txn: string | null
          quantity: number | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          house_item?: boolean | null
          id: string
          is_collection?: boolean | null
          listed?: boolean | null
          mint?: string | null
          owner?: string | null
          price?: number | null
          purchase_txn?: string | null
          quantity?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          house_item?: boolean | null
          id?: string
          is_collection?: boolean | null
          listed?: boolean | null
          mint?: string | null
          owner?: string | null
          price?: number | null
          purchase_txn?: string | null
          quantity?: number | null
          title?: string | null
        }
        Relationships: []
      }
      "degen-invest-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "distributooor-settings": {
        Row: {
          attribute_split: Json | null
          autosnap: boolean | null
          bonus_emission: Json | null
          created_at: string | null
          disabled: boolean | null
          distro_wallet: string | null
          emission: Json | null
          emoji: string | null
          in_all_snaps: boolean | null
          must_be_staked: boolean | null
          name: string
          nfts_per_share: number | null
          omit_royalty_evaders: boolean | null
          owner_wallet: string[] | null
          rarity_weighting: number | null
          storage_bucket: string | null
          title: string | null
          token: string | null
          token_decimals: number | null
          type: string | null
        }
        Insert: {
          attribute_split?: Json | null
          autosnap?: boolean | null
          bonus_emission?: Json | null
          created_at?: string | null
          disabled?: boolean | null
          distro_wallet?: string | null
          emission?: Json | null
          emoji?: string | null
          in_all_snaps?: boolean | null
          must_be_staked?: boolean | null
          name: string
          nfts_per_share?: number | null
          omit_royalty_evaders?: boolean | null
          owner_wallet?: string[] | null
          rarity_weighting?: number | null
          storage_bucket?: string | null
          title?: string | null
          token?: string | null
          token_decimals?: number | null
          type?: string | null
        }
        Update: {
          attribute_split?: Json | null
          autosnap?: boolean | null
          bonus_emission?: Json | null
          created_at?: string | null
          disabled?: boolean | null
          distro_wallet?: string | null
          emission?: Json | null
          emoji?: string | null
          in_all_snaps?: boolean | null
          must_be_staked?: boolean | null
          name?: string
          nfts_per_share?: number | null
          omit_royalty_evaders?: boolean | null
          owner_wallet?: string[] | null
          rarity_weighting?: number | null
          storage_bucket?: string | null
          title?: string | null
          token?: string | null
          token_decimals?: number | null
          type?: string | null
        }
        Relationships: []
      }
      "experiments-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "fox-club-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      gm: {
        Row: {
          address: string
          created_at: string | null
          id: number
          mint: string
          text: string | null
          verified: boolean | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: number
          mint: string
          text?: string | null
          verified?: boolean | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: number
          mint?: string
          text?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      "great-goats-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "great-goats-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "grimutant-conglomerate-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "hacker-fucker": {
        Row: {
          address: string
          collection: string
          created_at: string | null
          new_address: string | null
          uri: string
        }
        Insert: {
          address: string
          collection: string
          created_at?: string | null
          new_address?: string | null
          uri: string
        }
        Update: {
          address?: string
          collection?: string
          created_at?: string | null
          new_address?: string | null
          uri?: string
        }
        Relationships: []
      }
      "hedgehog-markets-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "hedgehog-markets-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "hello-pantha-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "hello-pantha-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "hello-pantha-rarity": {
        Row: {
          address: string | null
          created_at: string | null
          id: number
          name: string | null
          rank: number | null
          tier: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Relationships: []
      }
      "historical-royalties": {
        Row: {
          active_from: string | null
          active_to: string | null
          collection: string | null
          created_at: string | null
          creators: Json | null
          id: number
          seller_fee_basis_points: number | null
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          collection?: string | null
          created_at?: string | null
          creators?: Json | null
          id?: number
          seller_fee_basis_points?: number | null
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          collection?: string | null
          created_at?: string | null
          creators?: Json | null
          id?: number
          seller_fee_basis_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historical-royalties_collection_fkey"
            columns: ["collection"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          }
        ]
      }
      "immortals-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "immortals-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "immortals-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "live-mint-updater": {
        Row: {
          active: boolean | null
          created_at: string | null
          first_verified_creator: string | null
          name: string
          type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          first_verified_creator?: string | null
          name: string
          type: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          first_verified_creator?: string | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      "m00nshine-k9-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "m00nshine-k9-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      magpie: {
        Row: {
          address: string
          amount: number
          change_id: string | null
          claim_in_progress: number | null
          claimed: boolean | null
          created_at: string | null
          deleted: string | null
          id: string
          magpie: string
          mint: string | null
          rejected: string | null
        }
        Insert: {
          address: string
          amount?: number
          change_id?: string | null
          claim_in_progress?: number | null
          claimed?: boolean | null
          created_at?: string | null
          deleted?: string | null
          id?: string
          magpie: string
          mint?: string | null
          rejected?: string | null
        }
        Update: {
          address?: string
          amount?: number
          change_id?: string | null
          claim_in_progress?: number | null
          claimed?: boolean | null
          created_at?: string | null
          deleted?: string | null
          id?: string
          magpie?: string
          mint?: string | null
          rejected?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magpie_address_fkey"
            columns: ["address"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          },
          {
            foreignKeyName: "magpie_magpie_fkey"
            columns: ["magpie"]
            referencedRelation: "magpies"
            referencedColumns: ["id"]
          }
        ]
      }
      "magpie-claims": {
        Row: {
          address: string
          amount: number | null
          change_id: string | null
          created_at: string | null
          id: string
          magpie: string
          pending: boolean
          success: boolean | null
          transaction_started: string | null
        }
        Insert: {
          address: string
          amount?: number | null
          change_id?: string | null
          created_at?: string | null
          id?: string
          magpie: string
          pending?: boolean
          success?: boolean | null
          transaction_started?: string | null
        }
        Update: {
          address?: string
          amount?: number | null
          change_id?: string | null
          created_at?: string | null
          id?: string
          magpie?: string
          pending?: boolean
          success?: boolean | null
          transaction_started?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magpie-claims_magpie_fkey"
            columns: ["magpie"]
            referencedRelation: "magpie"
            referencedColumns: ["id"]
          }
        ]
      }
      magpies: {
        Row: {
          amount: number | null
          created_at: string | null
          deleted: string | null
          disabled: boolean | null
          expiry: string | null
          funded: boolean | null
          id: string
          label: string | null
          owner: string | null
          paid: boolean | null
          rejectable: boolean | null
          token: string | null
          token_decimals: number | null
          type: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          deleted?: string | null
          disabled?: boolean | null
          expiry?: string | null
          funded?: boolean | null
          id: string
          label?: string | null
          owner?: string | null
          paid?: boolean | null
          rejectable?: boolean | null
          token?: string | null
          token_decimals?: number | null
          type?: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          deleted?: string | null
          disabled?: boolean | null
          expiry?: string | null
          funded?: boolean | null
          id?: string
          label?: string | null
          owner?: string | null
          paid?: boolean | null
          rejectable?: boolean | null
          token?: string | null
          token_decimals?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "magpies_owner_fkey"
            columns: ["owner"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      mints: {
        Row: {
          added: boolean | null
          created_at: string
          mints: string[]
          omit_from_staking: boolean
          project: string
          type: string
        }
        Insert: {
          added?: boolean | null
          created_at?: string
          mints?: string[]
          omit_from_staking?: boolean
          project: string
          type: string
        }
        Update: {
          added?: boolean | null
          created_at?: string
          mints?: string[]
          omit_from_staking?: boolean
          project?: string
          type?: string
        }
        Relationships: []
      }
      "missionooor-collections": {
        Row: {
          collection_id: string
          created_at: string | null
          missionooor_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          missionooor_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          missionooor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missionooor-collections_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missionooor-collections_missionooor_id_fkey"
            columns: ["missionooor_id"]
            referencedRelation: "missionooors"
            referencedColumns: ["id"]
          }
        ]
      }
      missionooors: {
        Row: {
          advanced_grouping: boolean | null
          created_at: string | null
          id: string
          project_id: string | null
        }
        Insert: {
          advanced_grouping?: boolean | null
          created_at?: string | null
          id?: string
          project_id?: string | null
        }
        Update: {
          advanced_grouping?: boolean | null
          created_at?: string | null
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missionooors_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "project-settings"
            referencedColumns: ["name"]
          }
        ]
      }
      "mitsu-bears-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "mob-studios-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "mob-studios-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      nfts: {
        Row: {
          collection: string
          created_at: string | null
          first_verified_creator: string | null
          holder: string | null
          metadata: Json | null
          mint: string
          name: string | null
          pending_name: string | null
          points: number | null
          rank: number | null
          tier: string | null
          uri: string | null
          verified_collection_address: string | null
        }
        Insert: {
          collection: string
          created_at?: string | null
          first_verified_creator?: string | null
          holder?: string | null
          metadata?: Json | null
          mint: string
          name?: string | null
          pending_name?: string | null
          points?: number | null
          rank?: number | null
          tier?: string | null
          uri?: string | null
          verified_collection_address?: string | null
        }
        Update: {
          collection?: string
          created_at?: string | null
          first_verified_creator?: string | null
          holder?: string | null
          metadata?: Json | null
          mint?: string
          name?: string | null
          pending_name?: string | null
          points?: number | null
          rank?: number | null
          tier?: string | null
          uri?: string | null
          verified_collection_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfts_collection_fkey"
            columns: ["collection"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfts_holder_fkey"
            columns: ["holder"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "nightmare-project-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "onelink-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "patches-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "patches-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "pen-frens-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "pengsol-rarity": {
        Row: {
          address: string | null
          created_at: string | null
          id: number
          name: string | null
          rank: number | null
          tier: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Relationships: []
      }
      "piraterush-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "points-log": {
        Row: {
          action: string | null
          after: number | null
          amount: number | null
          before: number | null
          created_at: string | null
          id: string
          mint: string | null
          user: string | null
        }
        Insert: {
          action?: string | null
          after?: number | null
          amount?: number | null
          before?: number | null
          created_at?: string | null
          id?: string
          mint?: string | null
          user?: string | null
        }
        Update: {
          action?: string | null
          after?: number | null
          amount?: number | null
          before?: number | null
          created_at?: string | null
          id?: string
          mint?: string | null
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points-log_mint_fkey"
            columns: ["mint"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          }
        ]
      }
      "points-stakooor": {
        Row: {
          collection: string
          id: string
          mint: string | null
          staked_at: string | null
          unstaked_at: string | null
          wallet: string | null
        }
        Insert: {
          collection: string
          id?: string
          mint?: string | null
          staked_at?: string | null
          unstaked_at?: string | null
          wallet?: string | null
        }
        Update: {
          collection?: string
          id?: string
          mint?: string | null
          staked_at?: string | null
          unstaked_at?: string | null
          wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points-stakooor_collection_fkey"
            columns: ["collection"]
            referencedRelation: "project-settings"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "points-stakooor_mint_fkey"
            columns: ["mint"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          },
          {
            foreignKeyName: "points-stakooor_wallet_fkey"
            columns: ["wallet"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "pop-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "profile-wallets": {
        Row: {
          created_at: string | null
          profile_id: string
          public_key: string
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          public_key: string
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          public_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile-wallets_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile-wallets_public_key_fkey"
            columns: ["public_key"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          discord_id: string
          display_name: string | null
          id: string
          profile_picture: string | null
          slug: string | null
          twitter: string | null
        }
        Insert: {
          created_at?: string | null
          discord_id: string
          display_name?: string | null
          id?: string
          profile_picture?: string | null
          slug?: string | null
          twitter?: string | null
        }
        Update: {
          created_at?: string | null
          discord_id?: string
          display_name?: string | null
          id?: string
          profile_picture?: string | null
          slug?: string | null
          twitter?: string | null
        }
        Relationships: []
      }
      "project-admins": {
        Row: {
          created_at: string | null
          distributooor: string | null
          id: string
          project: string | null
          publicKey: string
        }
        Insert: {
          created_at?: string | null
          distributooor?: string | null
          id?: string
          project?: string | null
          publicKey: string
        }
        Update: {
          created_at?: string | null
          distributooor?: string | null
          id?: string
          project?: string | null
          publicKey?: string
        }
        Relationships: [
          {
            foreignKeyName: "project-admins_distributooor_fkey"
            columns: ["distributooor"]
            referencedRelation: "distributooor-settings"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "project-admins_project_fkey"
            columns: ["project"]
            referencedRelation: "rafflooor-settings"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "project-admins_publicKey_fkey"
            columns: ["publicKey"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "project-collections": {
        Row: {
          active_from: string | null
          active_until: string | null
          collection_id: string
          project_id: string
        }
        Insert: {
          active_from?: string | null
          active_until?: string | null
          collection_id: string
          project_id: string
        }
        Update: {
          active_from?: string | null
          active_until?: string | null
          collection_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project-collections_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project-collections_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      "project-settings": {
        Row: {
          advanced_grouping: boolean | null
          aggregate: boolean | null
          api_key: string | null
          app: string | null
          applications: string[] | null
          attribute_bonus: Json | null
          bonus_tokens_per_day: number | null
          created_at: string | null
          distro_wallet: string | null
          emission: Json | null
          emoji: string | null
          image: string | null
          include_mints: Json | null
          levels: Json | null
          live_meta_checking: boolean | null
          matching_bonus: Json | null
          max_supply: number | null
          meta_rarity: Json | null
          mint_new_tokens: boolean | null
          name: string
          omit_royalties_evaders: boolean | null
          owner_wallet: string[] | null
          percent_staked_only: string | null
          persist_emission: boolean | null
          quantity_emission: Json | null
          rarity_multiplier: number | null
          rarity_settings: Json | null
          secure_claims: boolean | null
          skip_advanced_emission: boolean | null
          slug: string | null
          split_percent_staked: Json | null
          theme: string | null
          title: string | null
          token_decimals: number | null
          token_public_key: string | null
          token_symbol: string | null
          tokens_per_day: number | null
          transaction_fee: number | null
          txn_sender: string | null
          ui_settings: Json | null
          unstake_on_mission: boolean | null
          url: string | null
          uses_nfts: boolean | null
        }
        Insert: {
          advanced_grouping?: boolean | null
          aggregate?: boolean | null
          api_key?: string | null
          app?: string | null
          applications?: string[] | null
          attribute_bonus?: Json | null
          bonus_tokens_per_day?: number | null
          created_at?: string | null
          distro_wallet?: string | null
          emission?: Json | null
          emoji?: string | null
          image?: string | null
          include_mints?: Json | null
          levels?: Json | null
          live_meta_checking?: boolean | null
          matching_bonus?: Json | null
          max_supply?: number | null
          meta_rarity?: Json | null
          mint_new_tokens?: boolean | null
          name: string
          omit_royalties_evaders?: boolean | null
          owner_wallet?: string[] | null
          percent_staked_only?: string | null
          persist_emission?: boolean | null
          quantity_emission?: Json | null
          rarity_multiplier?: number | null
          rarity_settings?: Json | null
          secure_claims?: boolean | null
          skip_advanced_emission?: boolean | null
          slug?: string | null
          split_percent_staked?: Json | null
          theme?: string | null
          title?: string | null
          token_decimals?: number | null
          token_public_key?: string | null
          token_symbol?: string | null
          tokens_per_day?: number | null
          transaction_fee?: number | null
          txn_sender?: string | null
          ui_settings?: Json | null
          unstake_on_mission?: boolean | null
          url?: string | null
          uses_nfts?: boolean | null
        }
        Update: {
          advanced_grouping?: boolean | null
          aggregate?: boolean | null
          api_key?: string | null
          app?: string | null
          applications?: string[] | null
          attribute_bonus?: Json | null
          bonus_tokens_per_day?: number | null
          created_at?: string | null
          distro_wallet?: string | null
          emission?: Json | null
          emoji?: string | null
          image?: string | null
          include_mints?: Json | null
          levels?: Json | null
          live_meta_checking?: boolean | null
          matching_bonus?: Json | null
          max_supply?: number | null
          meta_rarity?: Json | null
          mint_new_tokens?: boolean | null
          name?: string
          omit_royalties_evaders?: boolean | null
          owner_wallet?: string[] | null
          percent_staked_only?: string | null
          persist_emission?: boolean | null
          quantity_emission?: Json | null
          rarity_multiplier?: number | null
          rarity_settings?: Json | null
          secure_claims?: boolean | null
          skip_advanced_emission?: boolean | null
          slug?: string | null
          split_percent_staked?: Json | null
          theme?: string | null
          title?: string | null
          token_decimals?: number | null
          token_public_key?: string | null
          token_symbol?: string | null
          tokens_per_day?: number | null
          transaction_fee?: number | null
          txn_sender?: string | null
          ui_settings?: Json | null
          unstake_on_mission?: boolean | null
          url?: string | null
          uses_nfts?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project-settings_theme_fkey"
            columns: ["theme"]
            referencedRelation: "stakooor-themes"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      "rafflooor-settings": {
        Row: {
          active: boolean | null
          auctionooor_url: string | null
          auctions: boolean | null
          created_at: string | null
          decimals: number | null
          name: string
          raffles: boolean | null
          rafflooor_url: string | null
          token_address: string | null
          token_destination: string | null
          uses_mints: string | null
        }
        Insert: {
          active?: boolean | null
          auctionooor_url?: string | null
          auctions?: boolean | null
          created_at?: string | null
          decimals?: number | null
          name: string
          raffles?: boolean | null
          rafflooor_url?: string | null
          token_address?: string | null
          token_destination?: string | null
          uses_mints?: string | null
        }
        Update: {
          active?: boolean | null
          auctionooor_url?: string | null
          auctions?: boolean | null
          created_at?: string | null
          decimals?: number | null
          name?: string
          raffles?: boolean | null
          rafflooor_url?: string | null
          token_address?: string | null
          token_destination?: string | null
          uses_mints?: string | null
        }
        Relationships: []
      }
      "riveria-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "riveria-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          buyer: string | null
          created_at: string | null
          creators: Json | null
          debt: number | null
          debt_lamports: number | null
          expected_royalties: number | null
          id: string
          mint: string
          patched: boolean | null
          repaid_by: string | null
          repayment_transaction: string | null
          royalties_paid: number | null
          sale_date: string | null
          sale_price: number | null
          seller: string | null
          seller_fee_basis_points: number | null
          settled: string | null
        }
        Insert: {
          buyer?: string | null
          created_at?: string | null
          creators?: Json | null
          debt?: number | null
          debt_lamports?: number | null
          expected_royalties?: number | null
          id: string
          mint: string
          patched?: boolean | null
          repaid_by?: string | null
          repayment_transaction?: string | null
          royalties_paid?: number | null
          sale_date?: string | null
          sale_price?: number | null
          seller?: string | null
          seller_fee_basis_points?: number | null
          settled?: string | null
        }
        Update: {
          buyer?: string | null
          created_at?: string | null
          creators?: Json | null
          debt?: number | null
          debt_lamports?: number | null
          expected_royalties?: number | null
          id?: string
          mint?: string
          patched?: boolean | null
          repaid_by?: string | null
          repayment_transaction?: string | null
          royalties_paid?: number | null
          sale_date?: string | null
          sale_price?: number | null
          seller?: string | null
          seller_fee_basis_points?: number | null
          settled?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_mint_fkey"
            columns: ["mint"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          }
        ]
      }
      "secret-alpha-labs-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "secret-skellies-society-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "secret-skellies-society-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          secured: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "sol-city-poker-club-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "sorcies-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "sorcies-missions": {
        Row: {
          boost: boolean | null
          claimed_at: string | null
          completed: boolean | null
          created_at: string | null
          duration: number | null
          id: number
          mint: string
          mission_started: string | null
          price: number | null
          success: boolean | null
          transaction_started: string | null
          type: string | null
          wallet: string
          winning_chance: number | null
        }
        Insert: {
          boost?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          mint: string
          mission_started?: string | null
          price?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet: string
          winning_chance?: number | null
        }
        Update: {
          boost?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          mint?: string
          mission_started?: string | null
          price?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet?: string
          winning_chance?: number | null
        }
        Relationships: []
      }
      "sorcies-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      stakooor: {
        Row: {
          change_id: string | null
          claimed_at: string | null
          collection: string
          group: string | null
          id: string
          mint: string | null
          mints: string[] | null
          staked_at: string | null
          tokens_per_day: number | null
          unstaked_at: string | null
          wallet: string | null
        }
        Insert: {
          change_id?: string | null
          claimed_at?: string | null
          collection: string
          group?: string | null
          id?: string
          mint?: string | null
          mints?: string[] | null
          staked_at?: string | null
          tokens_per_day?: number | null
          unstaked_at?: string | null
          wallet?: string | null
        }
        Update: {
          change_id?: string | null
          claimed_at?: string | null
          collection?: string
          group?: string | null
          id?: string
          mint?: string | null
          mints?: string[] | null
          staked_at?: string | null
          tokens_per_day?: number | null
          unstaked_at?: string | null
          wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooor_collection_fkey"
            columns: ["collection"]
            referencedRelation: "project-settings"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "stakooor_mint_fkey"
            columns: ["mint"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          },
          {
            foreignKeyName: "stakooor_wallet_fkey"
            columns: ["wallet"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "stakooor-booster-collections": {
        Row: {
          created_at: string | null
          stakooor_booster_id: string
          stakooor_collection_id: string
        }
        Insert: {
          created_at?: string | null
          stakooor_booster_id: string
          stakooor_collection_id: string
        }
        Update: {
          created_at?: string | null
          stakooor_booster_id?: string
          stakooor_collection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-booster-collections_stakooor_booster_id_fkey"
            columns: ["stakooor_booster_id"]
            referencedRelation: "stakooor-boosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakooor-booster-collections_stakooor_collection_id_fkey"
            columns: ["stakooor_collection_id"]
            referencedRelation: "stakooor-collections"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-boosters": {
        Row: {
          affects: number | null
          created_at: string | null
          depends_on: string | null
          id: string
          max_per_base: number | null
          multiplier: number | null
          multiplier_config: Json | null
          quantity_config: Json | null
          stakooor_id: string | null
          tokens_per_day: number | null
          trait_type: string | null
        }
        Insert: {
          affects?: number | null
          created_at?: string | null
          depends_on?: string | null
          id?: string
          max_per_base?: number | null
          multiplier?: number | null
          multiplier_config?: Json | null
          quantity_config?: Json | null
          stakooor_id?: string | null
          tokens_per_day?: number | null
          trait_type?: string | null
        }
        Update: {
          affects?: number | null
          created_at?: string | null
          depends_on?: string | null
          id?: string
          max_per_base?: number | null
          multiplier?: number | null
          multiplier_config?: Json | null
          quantity_config?: Json | null
          stakooor_id?: string | null
          tokens_per_day?: number | null
          trait_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-boosters_depends_on_fkey"
            columns: ["depends_on"]
            referencedRelation: "stakooor-collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakooor-boosters_stakooor_id_fkey"
            columns: ["stakooor_id"]
            referencedRelation: "stakooors"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-collections": {
        Row: {
          base_emission: number | null
          boosted_emission: number | null
          collection_id: string
          created_at: string | null
          id: string
          include_attributes: Json | null
          stakooor_id: string | null
        }
        Insert: {
          base_emission?: number | null
          boosted_emission?: number | null
          collection_id: string
          created_at?: string | null
          id?: string
          include_attributes?: Json | null
          stakooor_id?: string | null
        }
        Update: {
          base_emission?: number | null
          boosted_emission?: number | null
          collection_id?: string
          created_at?: string | null
          id?: string
          include_attributes?: Json | null
          stakooor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-collections_collection_id_fkey"
            columns: ["collection_id"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakooor-collections_stakooor_id_fkey"
            columns: ["stakooor_id"]
            referencedRelation: "stakooors"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-emission": {
        Row: {
          active_from: string | null
          active_to: string | null
          collection: string | null
          created_at: string | null
          duration: number | null
          id: string
          multiplier: number | null
          multiplier_type: string | null
          ref_id: string | null
          stakooor_collection_id: string | null
          tokens_per_point: number | null
          trait_type: string | null
          type: string | null
          values: Json | null
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          collection?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          multiplier?: number | null
          multiplier_type?: string | null
          ref_id?: string | null
          stakooor_collection_id?: string | null
          tokens_per_point?: number | null
          trait_type?: string | null
          type?: string | null
          values?: Json | null
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          collection?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          multiplier?: number | null
          multiplier_type?: string | null
          ref_id?: string | null
          stakooor_collection_id?: string | null
          tokens_per_point?: number | null
          trait_type?: string | null
          type?: string | null
          values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-emission_collection_fkey"
            columns: ["collection"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakooor-emission_stakooor_collection_id_fkey"
            columns: ["stakooor_collection_id"]
            referencedRelation: "stakooor-collections"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-mints": {
        Row: {
          created_at: string | null
          nft_id: string
          stakooor_id: string
        }
        Insert: {
          created_at?: string | null
          nft_id: string
          stakooor_id: string
        }
        Update: {
          created_at?: string | null
          nft_id?: string
          stakooor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-mints_nft_id_fkey"
            columns: ["nft_id"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          },
          {
            foreignKeyName: "stakooor-mints_stakooor_id_fkey"
            columns: ["stakooor_id"]
            referencedRelation: "stakooor"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-themes": {
        Row: {
          colors: Json | null
          created_at: string | null
          fonts: Json | null
          id: string
          name: string | null
          options: Json | null
          stakooor_id: string | null
          vars: Json | null
        }
        Insert: {
          colors?: Json | null
          created_at?: string | null
          fonts?: Json | null
          id?: string
          name?: string | null
          options?: Json | null
          stakooor_id?: string | null
          vars?: Json | null
        }
        Update: {
          colors?: Json | null
          created_at?: string | null
          fonts?: Json | null
          id?: string
          name?: string | null
          options?: Json | null
          stakooor_id?: string | null
          vars?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-themes_stakooor_id_fkey"
            columns: ["stakooor_id"]
            referencedRelation: "stakooors"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-v2": {
        Row: {
          id: string
          mint: string
          staked_at: string
          stakooor: string
          unstaked_at: string | null
          wallet: string
        }
        Insert: {
          id?: string
          mint: string
          staked_at?: string
          stakooor: string
          unstaked_at?: string | null
          wallet: string
        }
        Update: {
          id?: string
          mint?: string
          staked_at?: string
          stakooor?: string
          unstaked_at?: string | null
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-v2_mint_fkey"
            columns: ["mint"]
            referencedRelation: "nfts"
            referencedColumns: ["mint"]
          },
          {
            foreignKeyName: "stakooor-v2_stakooor_fkey"
            columns: ["stakooor"]
            referencedRelation: "stakooor-v2-settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakooor-v2_wallet_fkey"
            columns: ["wallet"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "stakooor-v2-claims": {
        Row: {
          created_at: string
          id: string
          pending: boolean
          stakooor: string
          success: boolean | null
          tokens: number | null
          txn: string | null
          wallet: string
        }
        Insert: {
          created_at?: string
          id?: string
          pending?: boolean
          stakooor: string
          success?: boolean | null
          tokens?: number | null
          txn?: string | null
          wallet: string
        }
        Update: {
          created_at?: string
          id?: string
          pending?: boolean
          stakooor?: string
          success?: boolean | null
          tokens?: number | null
          txn?: string | null
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-v2-claims_stakooor_fkey"
            columns: ["stakooor"]
            referencedRelation: "stakooor-v2-settings"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-v2-collections": {
        Row: {
          active: boolean | null
          base_emission: number | null
          collection: string
          created_at: string
          id: string
          stakooor: string | null
        }
        Insert: {
          active?: boolean | null
          base_emission?: number | null
          collection: string
          created_at?: string
          id?: string
          stakooor?: string | null
        }
        Update: {
          active?: boolean | null
          base_emission?: number | null
          collection?: string
          created_at?: string
          id?: string
          stakooor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-v2-collections_collection_fkey"
            columns: ["collection"]
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakooor-v2-collections_stakooor_fkey"
            columns: ["stakooor"]
            referencedRelation: "stakooor-v2-settings"
            referencedColumns: ["id"]
          }
        ]
      }
      "stakooor-v2-settings": {
        Row: {
          active: boolean
          auth_pubkey: string
          created_at: string
          id: string
          name: string
          slug: string
          subscription: string
          token_address: string | null
          token_fees: boolean
          token_symbol: string | null
          url: string | null
        }
        Insert: {
          active?: boolean
          auth_pubkey: string
          created_at?: string
          id?: string
          name: string
          slug: string
          subscription?: string
          token_address?: string | null
          token_fees?: boolean
          token_symbol?: string | null
          url?: string | null
        }
        Update: {
          active?: boolean
          auth_pubkey?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          subscription?: string
          token_address?: string | null
          token_fees?: boolean
          token_symbol?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-v2-settings_auth_pubkey_fkey"
            columns: ["auth_pubkey"]
            referencedRelation: "users"
            referencedColumns: ["publicKey"]
          }
        ]
      }
      "stakooor-v2-themes": {
        Row: {
          active: boolean | null
          created_at: string | null
          name: string
          palette: Json
          stakooor: string | null
          typography: Json
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          name: string
          palette?: Json
          stakooor?: string | null
          typography?: Json
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          name?: string
          palette?: Json
          stakooor?: string | null
          typography?: Json
        }
        Relationships: [
          {
            foreignKeyName: "stakooor-v2-themes_stakooor_fkey"
            columns: ["stakooor"]
            referencedRelation: "stakooor-v2-settings"
            referencedColumns: ["id"]
          }
        ]
      }
      stakooors: {
        Row: {
          advanced_grouping: boolean | null
          created_at: string | null
          disabled: boolean | null
          id: string
          label: string | null
          points: boolean | null
          project_id: string | null
          slug: string | null
          url: string | null
        }
        Insert: {
          advanced_grouping?: boolean | null
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          label?: string | null
          points?: boolean | null
          project_id?: string | null
          slug?: string | null
          url?: string | null
        }
        Update: {
          advanced_grouping?: boolean | null
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          label?: string | null
          points?: boolean | null
          project_id?: string | null
          slug?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakooors_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "project-settings"
            referencedColumns: ["name"]
          }
        ]
      }
      "street-goats-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "suteki-missions": {
        Row: {
          boost: boolean | null
          claimed_at: string | null
          completed: boolean | null
          created_at: string | null
          duration: number | null
          id: number
          mint: string
          mission_started: string | null
          price: number | null
          success: boolean | null
          transaction_started: string | null
          type: string | null
          wallet: string
          winning_chance: number | null
        }
        Insert: {
          boost?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          mint: string
          mission_started?: string | null
          price?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet: string
          winning_chance?: number | null
        }
        Update: {
          boost?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: number
          mint?: string
          mission_started?: string | null
          price?: number | null
          success?: boolean | null
          transaction_started?: string | null
          type?: string | null
          wallet?: string
          winning_chance?: number | null
        }
        Relationships: []
      }
      "suteki-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      tensor_collections: {
        Row: {
          compressed: boolean | null
          created_at: number | null
          creator: string | null
          description: string | null
          discord: string | null
          fts: unknown | null
          hello_moon_collection_id: string | null
          image_uri: string | null
          last_updated: number | null
          market_cap: number | null
          mint_identifier: string | null
          name: string | null
          num_mints: number | null
          sample_mint: string | null
          seller_fee_basis_points: number | null
          slug: string
          slug_me: string | null
          slug_tensor: string
          symbol: string | null
          tensor_id: string
          tensor_verified: boolean | null
          token_standard: string | null
          traits: Json | null
          twitter: string | null
          verified_collection: string | null
          website: string | null
        }
        Insert: {
          compressed?: boolean | null
          created_at?: number | null
          creator?: string | null
          description?: string | null
          discord?: string | null
          fts?: unknown | null
          hello_moon_collection_id?: string | null
          image_uri?: string | null
          last_updated?: number | null
          market_cap?: number | null
          mint_identifier?: string | null
          name?: string | null
          num_mints?: number | null
          sample_mint?: string | null
          seller_fee_basis_points?: number | null
          slug: string
          slug_me?: string | null
          slug_tensor: string
          symbol?: string | null
          tensor_id: string
          tensor_verified?: boolean | null
          token_standard?: string | null
          traits?: Json | null
          twitter?: string | null
          verified_collection?: string | null
          website?: string | null
        }
        Update: {
          compressed?: boolean | null
          created_at?: number | null
          creator?: string | null
          description?: string | null
          discord?: string | null
          fts?: unknown | null
          hello_moon_collection_id?: string | null
          image_uri?: string | null
          last_updated?: number | null
          market_cap?: number | null
          mint_identifier?: string | null
          name?: string | null
          num_mints?: number | null
          sample_mint?: string | null
          seller_fee_basis_points?: number | null
          slug?: string
          slug_me?: string | null
          slug_tensor?: string
          symbol?: string | null
          tensor_id?: string
          tensor_verified?: boolean | null
          token_standard?: string | null
          traits?: Json | null
          twitter?: string | null
          verified_collection?: string | null
          website?: string | null
        }
        Relationships: []
      }
      "test-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "test-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          secured: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          discord: string | null
          free_access: boolean | null
          name: string | null
          publicKey: string
          super_admin: boolean | null
          twitter: string | null
        }
        Insert: {
          created_at?: string | null
          discord?: string | null
          free_access?: boolean | null
          name?: string | null
          publicKey: string
          super_admin?: boolean | null
          twitter?: string | null
        }
        Update: {
          created_at?: string | null
          discord?: string | null
          free_access?: boolean | null
          name?: string | null
          publicKey?: string
          super_admin?: boolean | null
          twitter?: string | null
        }
        Relationships: []
      }
      "vox-ninjas-rarity": {
        Row: {
          address: string | null
          created_at: string | null
          id: number
          name: string | null
          rank: number | null
          tier: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Relationships: []
      }
      "wallet-map": {
        Row: {
          created_at: string | null
          private_key: string | null
          public_key: string
        }
        Insert: {
          created_at?: string | null
          private_key?: string | null
          public_key: string
        }
        Update: {
          created_at?: string | null
          private_key?: string | null
          public_key?: string
        }
        Relationships: []
      }
      "wl-token-project-settings": {
        Row: {
          created_at: string | null
          distro_wallet: string | null
          id: number
          name: string | null
          token_public_key: string | null
        }
        Insert: {
          created_at?: string | null
          distro_wallet?: string | null
          id?: number
          name?: string | null
          token_public_key?: string | null
        }
        Update: {
          created_at?: string | null
          distro_wallet?: string | null
          id?: number
          name?: string | null
          token_public_key?: string | null
        }
        Relationships: []
      }
      "xin-dragons-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "xin-dragons-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          secured: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "xin-dragons-rarity": {
        Row: {
          created_at: string | null
          mint: string
          rank: number
          type: string | null
        }
        Insert: {
          created_at?: string | null
          mint: string
          rank: number
          type?: string | null
        }
        Update: {
          created_at?: string | null
          mint?: string
          rank?: number
          type?: string | null
        }
        Relationships: []
      }
      "xin-dragons-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
      "yeah-tigers-auctions": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          discord: string | null
          duration: number | null
          funded: boolean | null
          grace_period: number
          id: string
          label: string | null
          min_bid_increment: number | null
          owner: string | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          starting_price: number | null
          twitter: string | null
          type: string | null
          winner: string | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          discord?: string | null
          duration?: number | null
          funded?: boolean | null
          grace_period?: number
          id?: string
          label?: string | null
          min_bid_increment?: number | null
          owner?: string | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          starting_price?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      "yeah-tigers-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          secured: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          secured?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "yeah-tigers-rarity": {
        Row: {
          address: string | null
          created_at: string | null
          id: number
          name: string | null
          rank: number | null
          tier: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string | null
          rank?: number | null
          tier?: string | null
        }
        Relationships: []
      }
      "zenin-raffles": {
        Row: {
          active: boolean | null
          claim_transaction: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          discord: string | null
          end_date: string | null
          funded: boolean | null
          holding: string | null
          id: string
          image: string | null
          image_path: string | null
          label: string | null
          max_purchase: number | null
          min_time_held: number | null
          name: string | null
          num_tickets: number | null
          num_winners: number | null
          owner: string | null
          price: number | null
          prize: string | null
          prize_claimed: boolean | null
          prize_sent: boolean | null
          start_date: string | null
          tickets_sold: number | null
          twitter: string | null
          type: string | null
          winner: string | null
          wl_winners: string[] | null
        }
        Insert: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id: string
          image?: string | null
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Update: {
          active?: boolean | null
          claim_transaction?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          discord?: string | null
          end_date?: string | null
          funded?: boolean | null
          holding?: string | null
          id?: string
          image?: string | null
          image_path?: string | null
          label?: string | null
          max_purchase?: number | null
          min_time_held?: number | null
          name?: string | null
          num_tickets?: number | null
          num_winners?: number | null
          owner?: string | null
          price?: number | null
          prize?: string | null
          prize_claimed?: boolean | null
          prize_sent?: boolean | null
          start_date?: string | null
          tickets_sold?: number | null
          twitter?: string | null
          type?: string | null
          winner?: string | null
          wl_winners?: string[] | null
        }
        Relationships: []
      }
      "zenin-revenue-share": {
        Row: {
          address: string
          change_id: string | null
          claim_in_progress: number | null
          created_at: string | null
          sol_to_claim: number
        }
        Insert: {
          address: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Update: {
          address?: string
          change_id?: string | null
          claim_in_progress?: number | null
          created_at?: string | null
          sol_to_claim?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_nfts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_table_sql: {
        Args: {
          p_table_name: string
        }
        Returns: string[]
      }
      dump_with_insert: {
        Args: {
          p_table_name: string
          p_limit: number
        }
        Returns: string[]
      }
      get_all_points: {
        Args: {
          coll: string
          pk?: string
        }
        Returns: {
          mint: string
          points: number
        }[]
      }
      get_all_stakooor_mints: {
        Args: Record<PropertyKey, never>
        Returns: {
          mint: string
        }[]
      }
      get_biblio_passes_for_user: {
        Args: {
          pk: string
        }
        Returns: {
          mint: string
          time_staked: number
          hours_active: number
          number_wallets: number
          active: boolean
          collection_name: string
          metadata: Json
        }[]
      }
      get_biblio_user: {
        Args: {
          pk: string
        }
        Returns: Record<string, unknown>
      }
      get_biblo_passes_for_user: {
        Args: {
          pk: string
        }
        Returns: {
          mint: string
          time_staked: number
          hours_active: number
          number_wallets: number
          active: boolean
          collection_name: string
          metadata: Json
        }[]
      }
      get_claimed_for_magpie: {
        Args: {
          magpie_id?: string
        }
        Returns: number
      }
      get_collection_info: {
        Args: {
          coll?: string
        }
        Returns: Record<string, unknown>
      }
      get_collections_with_royalties: {
        Args: {
          rows?: number
          page?: number
        }
        Returns: {
          id: string
          image: string
          name: string
          total_sales: number
          total_debt: number
          total_paid: number
          expected_royalties: number
        }[]
      }
      get_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          project_id: string
          total_mints: number
          total_staked: number
        }[]
      }
      get_leaderboard: {
        Args: {
          coll?: string
          rows?: number
        }
        Returns: {
          public_key: string
          total_paid: number
          expected_royalties: number
        }[]
      }
      get_mints_with_outstanding_debt: {
        Args: Record<PropertyKey, never>
        Returns: {
          mint: string
          txn_id: string
          debt_lamports: number
          sale_date: string
        }[]
      }
      get_mints_with_royalties: {
        Args: {
          coll: string
          public_key?: string
          mints?: string[]
        }
        Returns: {
          mint: string
          metadata: Json
          holder: string
          collection_id: string
          project: string
          type: string
          rank: number
          tier: string
          last_sale: Json
        }[]
      }
      get_mints_with_royalties_for_collection: {
        Args: {
          coll?: string
          public_key?: string
          rows?: number
          start?: number
          order_by?: string
        }
        Returns: {
          mint: string
          collection: string
          image: string
          meta_name: string
          outstanding_debt: number
          debt_lamports: number
          settled: string
          txn_id: string
          sale_date: string
          royalties_paid: number
          creators: Json
          seller_fee_basis_points: number
          holder: string
          buyer: string
        }[]
      }
      get_mints_with_royalties_for_collection_sort_by_outstanding: {
        Args: {
          coll?: string
          public_key?: string
          rows?: number
          page?: number
          start?: number
          order_by?: string
        }
        Returns: {
          mint: string
          collection: string
          image: string
          meta_name: string
          outstanding_debt: number
          debt_lamports: number
          settled: string
          txn_id: string
          sale_date: string
          royalties_paid: number
          creators: Json
          seller_fee_basis_points: number
          holder: string
          buyer: string
        }[]
      }
      get_mints_with_royalties_for_collection_sort_by_paid: {
        Args: {
          coll?: string
          public_key?: string
          rows?: number
          page?: number
          start?: number
          order_by?: string
        }
        Returns: {
          mint: string
          collection: string
          image: string
          meta_name: string
          outstanding_debt: number
          debt_lamports: number
          settled: string
          txn_id: string
          sale_date: string
          royalties_paid: number
          creators: Json
          seller_fee_basis_points: number
          holder: string
          buyer: string
        }[]
      }
      get_nft_with_royalties: {
        Args: {
          coll?: string
          public_key?: string
          mint_address?: string
        }
        Returns: {
          mint: string
          metadata: Json
          holder: string
          collection_id: string
          rank: number
          tier: string
          last_sale: Json
        }[]
      }
      get_nfts_for_collection: {
        Args: {
          coll: string
        }
        Returns: {
          collection: string
          created_at: string | null
          first_verified_creator: string | null
          holder: string | null
          metadata: Json | null
          mint: string
          name: string | null
          pending_name: string | null
          points: number | null
          rank: number | null
          tier: string | null
          uri: string | null
          verified_collection_address: string | null
        }[]
      }
      get_outstanding_for_wallet: {
        Args: {
          public_key: string
        }
        Returns: {
          mint: string
          collection_id: string
          sale_date: string
          debt: number
          settled: string
          royalties_paid: number
          txn_id: string
        }[]
      }
      get_paid_for_wallet: {
        Args: {
          public_key: string
        }
        Returns: {
          mint: string
          collection_id: string
          sale_date: string
          debt: number
          settled: string
          royalties_paid: number
          txn_id: string
        }[]
      }
      get_paid_royalties_for_collection: {
        Args: {
          coll: string
          before?: string
          after?: string
        }
        Returns: number
      }
      get_points_stakooor_info: {
        Args: {
          coll?: string
        }
        Returns: Record<string, unknown>
      }
      get_points_stakooor_mints: {
        Args: {
          coll?: string
          public_key?: string
        }
        Returns: {
          mint: string
          metadata: Json
          holder: string
          collection_id: string
          project: string
          type: string
          rank: number
          tier: string
          points: number
          emission: number
          staked: Json
        }[]
      }
      get_recent_sales: {
        Args: {
          public_key?: string
          coll?: string
          rows?: number
        }
        Returns: {
          txn_id: string
          mint: string
          image: string
          sale_price: number
          sale_date: string
          royalties_paid: number
          debt_lamports: number
          settled: string
        }[]
      }
      get_rejected_for_magpie: {
        Args: {
          magpie_id?: string
        }
        Returns: number
      }
      get_repaid_for_wallet: {
        Args: {
          public_key: string
        }
        Returns: {
          mint: string
          collection_id: string
          sale_date: string
          debt: number
          settled: string
          royalties_paid: number
          txn_id: string
        }[]
      }
      get_royalties_for_collection: {
        Args: {
          coll: string
          before?: string
          after?: string
        }
        Returns: {
          mint: string
          debt: number
          settled: string
          txn_id: string
          sale_date: string
        }[]
      }
      get_royalties_for_wallet: {
        Args: {
          public_key: string
        }
        Returns: Record<string, unknown>
      }
      get_royalties_status_for_mint:
        | {
            Args: {
              pr_mint: string
            }
            Returns: {
              txn_id: string
              mint: string
              collection: string
              debt: number
              sale_date: string
              settled: string
              creators: Json
              seller_fee_basis_points: number
              sale_price: number
              buyer: string
              seller: string
              royalties_paid: number
            }[]
          }
        | {
            Args: {
              pr_mint: string
              coll: string
            }
            Returns: {
              txn_id: string
              mint: string
              collection: string
              debt: number
              sale_date: string
              settled: string
              creators: Json
              seller_fee_basis_points: number
              sale_price: number
              buyer: string
              seller: string
              royalties_paid: number
            }[]
          }
      get_royalties_status_for_wallet: {
        Args: {
          public_key: string
          coll: string
        }
        Returns: {
          txn_id: string
          mint: string
          collection: string
          debt: number
          sale_date: string
          settled: string
          creators: Json
          seller_fee_basis_points: number
          sale_price: number
          buyer: string
          seller: string
          royalties_paid: number
        }[]
      }
      get_royalties_summary: {
        Args: {
          coll?: string
          public_key?: string
        }
        Returns: Record<string, unknown>
      }
      get_royalties_summary_beta: {
        Args: {
          coll?: string
          public_key?: string
          days?: number
        }
        Returns: Record<string, unknown>
      }
      get_sales_over_time: {
        Args: {
          coll?: string
        }
        Returns: {
          segment: string
          expected_amount: number
          actual_amount: number
        }[]
      }
      get_staked: {
        Args: {
          coll?: string
          public_key?: string
          only_staked?: boolean
        }
        Returns: {
          id: string
          collection: string
          wallet: string
          staked_at: string
          unstaked_at: string
          tokens_per_day: number
          mints: Json
          mint: Json
        }[]
      }
      get_staked_items: {
        Args: {
          in_mints?: string[]
        }
        Returns: {
          id: string
        }[]
      }
      get_staked_mints: {
        Args: {
          in_mints?: string[]
        }
        Returns: {
          mint: string
        }[]
      }
      get_stakooor_config: {
        Args: {
          coll: string
          hostname?: string
        }
        Returns: {
          name: string
          disabled: boolean
          token_public_key: string
          distro_wallet: string
          url: string
          slug: string
          mint_new_tokens: boolean
          max_supply: number
          token_decimals: number
          transaction_fee: number
          title: string
          token_symbol: string
          persist_emission: boolean
          unstake_on_mission: boolean
          advanced_grouping: boolean
          split_percent_staked: Json
          matching_bonus: Json
          include_mints: Json
          uses_nfts: boolean
          secure_claims: boolean
          omit_royalties_evaders: boolean
          percent_staked_only: string
          collections: Json
          boosters: Json
          theme: Json
          levels: Json
        }[]
      }
      get_stakooor_mints:
        | {
            Args: {
              coll: string
              public_key: string
            }
            Returns: {
              mint: string
              metadata: Json
              holder: string
              collection_id: string
              project: string
              type: string
              staked: boolean
              last_sale: Json
            }[]
          }
        | {
            Args: {
              coll?: string
            }
            Returns: {
              mint: string
            }[]
          }
      get_stakooor_mints_beta: {
        Args: {
          coll: string
          public_key: string
          mints?: string[]
        }
        Returns: {
          mint: string
          metadata: Json
          holder: string
          collection_id: string
          project: string
          type: string
          rank: number
          tier: string
          staked: boolean
          last_sale: Json
        }[]
      }
      get_stakooor_mints_gamma: {
        Args: {
          coll?: string
          public_key?: string
          mints?: string[]
        }
        Returns: {
          mint: string
          metadata: Json
          holder: string
          collection_id: string
          project: string
          type: string
          rank: number
          tier: string
          staked: boolean
          last_sale: Json
        }[]
      }
      get_total_paid_royalties: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_total_repaid_royalties: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_total_unpaid_royalties: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_unclaimed_for_magpie: {
        Args: {
          magpie_id?: string
        }
        Returns: number
      }
      get_unpaid_royalties_for_collection: {
        Args: {
          coll: string
          before?: string
          after?: string
        }
        Returns: number
      }
      get_weekly_leaders: {
        Args: Record<PropertyKey, never>
        Returns: {
          segment: string
          id: string
          name: string
          actual_amount: number
          expected_amount: number
        }[]
      }
      settle_debt: {
        Args: {
          sale_id: string
          sale_settled: string
          sale_repayment_transaction: string
          sale_repaid_by: string
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
