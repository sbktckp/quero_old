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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          meta: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option_id: string | null
          test_attempt_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option_id?: string | null
          test_attempt_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option_id?: string | null
          test_attempt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number | null
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      college_cutoffs: {
        Row: {
          category: string
          closing_rank: number
          college_id: string
          counseling_body: string
          created_at: string
          id: string
          opening_rank: number | null
          quota: string | null
          round: string
          state: string | null
          year: number
        }
        Insert: {
          category: string
          closing_rank: number
          college_id: string
          counseling_body: string
          created_at?: string
          id?: string
          opening_rank?: number | null
          quota?: string | null
          round: string
          state?: string | null
          year: number
        }
        Update: {
          category?: string
          closing_rank?: number
          college_id?: string
          counseling_body?: string
          created_at?: string
          id?: string
          opening_rank?: number | null
          quota?: string | null
          round?: string
          state?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "college_cutoffs_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      college_reviews: {
        Row: {
          academics_rating: number | null
          campus_life_rating: number | null
          college_id: string
          created_at: string
          faculty_rating: number | null
          hostel_rating: number | null
          id: string
          internship_rating: number | null
          is_verified: boolean
          mess_rating: number | null
          patient_exposure_rating: number | null
          review_text: string | null
          safety_rating: number | null
          user_id: string
        }
        Insert: {
          academics_rating?: number | null
          campus_life_rating?: number | null
          college_id: string
          created_at?: string
          faculty_rating?: number | null
          hostel_rating?: number | null
          id?: string
          internship_rating?: number | null
          is_verified?: boolean
          mess_rating?: number | null
          patient_exposure_rating?: number | null
          review_text?: string | null
          safety_rating?: number | null
          user_id: string
        }
        Update: {
          academics_rating?: number | null
          campus_life_rating?: number | null
          college_id?: string
          created_at?: string
          faculty_rating?: number | null
          hostel_rating?: number | null
          id?: string
          internship_rating?: number | null
          is_verified?: boolean
          mess_rating?: number | null
          patient_exposure_rating?: number | null
          review_text?: string | null
          safety_rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_reviews_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          annual_fees_max: number | null
          annual_fees_min: number | null
          bond_amount: number | null
          bond_years: number | null
          city: string | null
          created_at: string
          created_by: string | null
          hostel_available: boolean
          id: string
          institution_type: string
          is_active: boolean
          name: string
          nmc_recognized: boolean
          state: string
          total_seats: number | null
          updated_at: string
        }
        Insert: {
          annual_fees_max?: number | null
          annual_fees_min?: number | null
          bond_amount?: number | null
          bond_years?: number | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          hostel_available?: boolean
          id?: string
          institution_type: string
          is_active?: boolean
          name: string
          nmc_recognized?: boolean
          state: string
          total_seats?: number | null
          updated_at?: string
        }
        Update: {
          annual_fees_max?: number | null
          annual_fees_min?: number | null
          bond_amount?: number | null
          bond_years?: number | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          hostel_available?: boolean
          id?: string
          institution_type?: string
          is_active?: boolean
          name?: string
          nmc_recognized?: boolean
          state?: string
          total_seats?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_settings: {
        Row: {
          id: boolean
          instagram_url: string | null
          show_whatsapp_social: boolean
          support_email: string
          support_hours_days: string
          support_hours_time: string
          support_phone: string | null
          support_whatsapp: string | null
          telegram_url: string | null
          updated_at: string
          updated_by: string | null
          youtube_url: string | null
        }
        Insert: {
          id?: boolean
          instagram_url?: string | null
          show_whatsapp_social?: boolean
          support_email?: string
          support_hours_days?: string
          support_hours_time?: string
          support_phone?: string | null
          support_whatsapp?: string | null
          telegram_url?: string | null
          updated_at?: string
          updated_by?: string | null
          youtube_url?: string | null
        }
        Update: {
          id?: boolean
          instagram_url?: string | null
          show_whatsapp_social?: boolean
          support_email?: string
          support_hours_days?: string
          support_hours_time?: string
          support_phone?: string | null
          support_whatsapp?: string | null
          telegram_url?: string | null
          updated_at?: string
          updated_by?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      counseling_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_published: boolean
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      counseling_events: {
        Row: {
          counseling_body: string
          created_at: string
          end_date: string | null
          event_type: string
          id: string
          is_active: boolean
          notes: string | null
          start_date: string
          title: string
          year: number
        }
        Insert: {
          counseling_body: string
          created_at?: string
          end_date?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          notes?: string | null
          start_date: string
          title: string
          year: number
        }
        Update: {
          counseling_body?: string
          created_at?: string
          end_date?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          start_date?: string
          title?: string
          year?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_purchase: number | null
          plan_restriction: string | null
          times_used: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_purchase?: number | null
          plan_restriction?: string | null
          times_used?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_purchase?: number | null
          plan_restriction?: string | null
          times_used?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_plan_restriction_fkey"
            columns: ["plan_restriction"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          sections: Json | null
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          sections?: Json | null
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          sections?: Json | null
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          coupon_id: string | null
          created_at: string
          currency: string
          gateway: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          id: string
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          coupon_id?: string | null
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          status: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          coupon_id?: string | null
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_period: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          price_inr: number
          tier: string
          updated_at: string
        }
        Insert: {
          billing_period: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_inr?: number
          tier: string
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_inr?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          chapter_id: string | null
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          is_pyq: boolean
          pyq_exam: string | null
          pyq_year: number | null
          question_text: string
          subject_id: string
          topic_id: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_pyq?: boolean
          pyq_exam?: string | null
          pyq_year?: number | null
          question_text: string
          subject_id: string
          topic_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_pyq?: boolean
          pyq_exam?: string | null
          pyq_year?: number | null
          question_text?: string
          subject_id?: string
          topic_id?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          action: string
          id: number
          ts: string
          user_id: string
        }
        Insert: {
          action: string
          id?: number
          ts?: string
          user_id: string
        }
        Update: {
          action?: string
          id?: number
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          exam_type: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          exam_type?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          exam_type?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          end_date: string | null
          granted_by: string | null
          id: string
          plan_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          end_date?: string | null
          granted_by?: string | null
          id?: string
          plan_id: string
          start_date?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          end_date?: string | null
          granted_by?: string | null
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          founder_message: string | null
          id: string
          is_active: boolean
          is_founder: boolean
          name: string
          photo_url: string | null
          role: string
          short_bio: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_message?: string | null
          id?: string
          is_active?: boolean
          is_founder?: boolean
          name: string
          photo_url?: string | null
          role: string
          short_bio?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_message?: string | null
          id?: string
          is_active?: boolean
          is_founder?: boolean
          name?: string
          photo_url?: string | null
          role?: string
          short_bio?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          correct_count: number
          created_at: string
          duration_seconds: number
          id: string
          mode: Database["public"]["Enums"]["test_mode"]
          score: number
          started_at: string
          subject_id: string | null
          submitted_at: string | null
          test_id: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          mode?: Database["public"]["Enums"]["test_mode"]
          score?: number
          started_at?: string
          subject_id?: string | null
          submitted_at?: string | null
          test_id?: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          mode?: Database["public"]["Enums"]["test_mode"]
          score?: number
          started_at?: string
          subject_id?: string | null
          submitted_at?: string | null
          test_id?: string | null
          test_type?: Database["public"]["Enums"]["test_type"]
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          id: string
          question_id: string
          sort_order: number | null
          test_id: string
        }
        Insert: {
          id?: string
          question_id: string
          sort_order?: number | null
          test_id: string
        }
        Update: {
          id?: string
          question_id?: string
          sort_order?: number | null
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number
          id: string
          mode: Database["public"]["Enums"]["test_mode"]
          question_count: number
          subject_id: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          mode?: Database["public"]["Enums"]["test_mode"]
          question_count?: number
          subject_id?: string | null
          test_type: Database["public"]["Enums"]["test_type"]
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          mode?: Database["public"]["Enums"]["test_mode"]
          question_count?: number
          subject_id?: string | null
          test_type?: Database["public"]["Enums"]["test_type"]
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          exam_year: number | null
          goal: Database["public"]["Enums"]["study_goal"] | null
          language: string | null
          onboarding_completed: boolean
          updated_at: string
          user_id: string
          weak_subjects: string[] | null
        }
        Insert: {
          created_at?: string
          exam_year?: number | null
          goal?: Database["public"]["Enums"]["study_goal"] | null
          language?: string | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
          weak_subjects?: string[] | null
        }
        Update: {
          created_at?: string
          exam_year?: number | null
          goal?: Database["public"]["Enums"]["study_goal"] | null
          language?: string | null
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
          weak_subjects?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_insert_question_with_options: {
        Args: { _payload: Json }
        Returns: string
      }
      admin_set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_upsert_question: { Args: { _payload: Json }; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      enforce_rate_limit: {
        Args: { _action: string; _max: number; _window_seconds: number }
        Returns: undefined
      }
      finalize_attempt: {
        Args: { _attempt_id: string }
        Returns: {
          correct_count: number
          score: number
          total_questions: number
        }[]
      }
      get_attempt_review: { Args: { _attempt_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_answer: {
        Args: { _attempt_id: string; _option_id: string; _question_id: string }
        Returns: {
          correct_option_id: string
          explanation: string
          is_correct: boolean
        }[]
      }
    }
    Enums: {
      app_role: "student" | "admin"
      study_goal: "neet_ug" | "neet_pg"
      test_mode: "timed" | "practice"
      test_type:
        | "full"
        | "subject"
        | "chapter"
        | "topic"
        | "daily_pyq"
        | "custom"
        | "pyq"
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
    Enums: {
      app_role: ["student", "admin"],
      study_goal: ["neet_ug", "neet_pg"],
      test_mode: ["timed", "practice"],
      test_type: [
        "full",
        "subject",
        "chapter",
        "topic",
        "daily_pyq",
        "custom",
        "pyq",
      ],
    },
  },
} as const
