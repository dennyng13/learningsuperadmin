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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          activity_date: string
          created_at: string
          id: string
          listening: number
          reading: number
          speaking: number
          time_minutes: number
          user_id: string
          writing: number
        }
        Insert: {
          activity_date: string
          created_at?: string
          id?: string
          listening?: number
          reading?: number
          speaking?: number
          time_minutes?: number
          user_id: string
          writing?: number
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: string
          listening?: number
          reading?: number
          speaking?: number
          time_minutes?: number
          user_id?: string
          writing?: number
        }
        Relationships: []
      }
      assessments: {
        Row: {
          allow_retake: boolean
          available_from: string | null
          available_until: string | null
          book_name: string | null
          content_type: string
          course_level: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          duration: number
          id: string
          image_cover: string | null
          name: string
          program: string | null
          question_types: Json | null
          scoring_mode: string
          section_type: string
          status: string
          timer_enabled: boolean
          total_questions: number
          updated_at: string
        }
        Insert: {
          allow_retake?: boolean
          available_from?: string | null
          available_until?: string | null
          book_name?: string | null
          content_type?: string
          course_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          duration?: number
          id?: string
          image_cover?: string | null
          name: string
          program?: string | null
          question_types?: Json | null
          scoring_mode?: string
          section_type: string
          status?: string
          timer_enabled?: boolean
          total_questions?: number
          updated_at?: string
        }
        Update: {
          allow_retake?: boolean
          available_from?: string | null
          available_until?: string | null
          book_name?: string | null
          content_type?: string
          course_level?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          duration?: number
          id?: string
          image_cover?: string | null
          name?: string
          program?: string | null
          question_types?: Json | null
          scoring_mode?: string
          section_type?: string
          status?: string
          timer_enabled?: boolean
          total_questions?: number
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          created_by: string
          criteria_config: Json | null
          criteria_type: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          criteria_config?: Json | null
          criteria_type?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          criteria_config?: Json | null
          criteria_type?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      band_descriptors: {
        Row: {
          band: number
          created_at: string
          criteria: string
          description: string
          id: string
          skill: string
          task_type: string
          updated_at: string
        }
        Insert: {
          band: number
          created_at?: string
          criteria: string
          description?: string
          id?: string
          skill: string
          task_type?: string
          updated_at?: string
        }
        Update: {
          band?: number
          created_at?: string
          criteria?: string
          description?: string
          id?: string
          skill?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_announcements: {
        Row: {
          class_id: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_levels: {
        Row: {
          color_key: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color_key?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color_key?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          description: string | null
          display_name: string
          enabled: boolean
          id: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          description?: string | null
          display_name: string
          enabled?: boolean
          id?: string
          subject?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          id?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exam_autosave: {
        Row: {
          answers: Json
          assessment_id: string
          current_part: number
          id: string
          time_remaining: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          assessment_id: string
          current_part?: number
          id?: string
          time_remaining?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          assessment_id?: string
          current_part?: number
          id?: string
          time_remaining?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_assignments: {
        Row: {
          assigned_by: string
          class_id: string
          created_at: string
          due_date: string | null
          exercise_id: string
          id: string
        }
        Insert: {
          assigned_by: string
          class_id: string
          created_at?: string
          due_date?: string | null
          exercise_id: string
          id?: string
        }
        Update: {
          assigned_by?: string
          class_id?: string
          created_at?: string
          due_date?: string | null
          exercise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_templates: {
        Row: {
          band_range: string
          created_at: string
          created_by: string | null
          criteria: string
          id: string
          is_global: boolean
          skill: string
          template_text: string
        }
        Insert: {
          band_range: string
          created_at?: string
          created_by?: string | null
          criteria: string
          id?: string
          is_global?: boolean
          skill?: string
          template_text: string
        }
        Update: {
          band_range?: string
          created_at?: string
          created_by?: string | null
          criteria?: string
          id?: string
          is_global?: boolean
          skill?: string
          template_text?: string
        }
        Relationships: []
      }
      flashcard_set_items: {
        Row: {
          back: string
          created_at: string
          front: string
          id: string
          image_url: string | null
          order: number
          set_id: string
        }
        Insert: {
          back: string
          created_at?: string
          front: string
          id?: string
          image_url?: string | null
          order?: number
          set_id: string
        }
        Update: {
          back?: string
          created_at?: string
          front?: string
          id?: string
          image_url?: string | null
          order?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_set_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sets: {
        Row: {
          course_level: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          linked_assessment_id: string | null
          linked_exercise_id: string | null
          program: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_level?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          linked_assessment_id?: string | null
          linked_exercise_id?: string | null
          program?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_level?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          linked_assessment_id?: string | null
          linked_exercise_id?: string | null
          program?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          audio_url: string | null
          back: string
          created_at: string
          ease_factor: number
          example_sentence: string | null
          front: string
          id: string
          interval_days: number
          mastered: boolean
          next_review: string
          repetitions: number
          source_set_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          back: string
          created_at?: string
          ease_factor?: number
          example_sentence?: string | null
          front: string
          id?: string
          interval_days?: number
          mastered?: boolean
          next_review?: string
          repetitions?: number
          source_set_id?: string | null
          source_type?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          back?: string
          created_at?: string
          ease_factor?: number
          example_sentence?: string | null
          front?: string
          id?: string
          interval_days?: number
          mastered?: boolean
          next_review?: string
          repetitions?: number
          source_set_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_source_set_id_fkey"
            columns: ["source_set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          created_at: string
          difficulty: string | null
          game_mode: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          game_mode: string
          id?: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          game_mode?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      mock_test_progress: {
        Row: {
          completed_at: string
          id: string
          mock_test_id: string
          result_data: Json
          skill: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          mock_test_id: string
          result_data?: Json
          skill: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          mock_test_id?: string
          result_data?: Json
          skill?: string
          user_id?: string
        }
        Relationships: []
      }
      module_access: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parts: {
        Row: {
          assessment_id: string
          audio_url: string | null
          created_at: string
          cue_card: Json | null
          description: string | null
          duration: number | null
          id: string
          order: number
          prep_time: number | null
          task_metadata: Json | null
          title: string
        }
        Insert: {
          assessment_id: string
          audio_url?: string | null
          created_at?: string
          cue_card?: Json | null
          description?: string | null
          duration?: number | null
          id?: string
          order?: number
          prep_time?: number | null
          task_metadata?: Json | null
          title: string
        }
        Update: {
          assessment_id?: string
          audio_url?: string | null
          created_at?: string
          cue_card?: Json | null
          description?: string | null
          duration?: number | null
          id?: string
          order?: number
          prep_time?: number | null
          task_metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          part_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          id?: string
          part_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          part_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "passages_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_test_sections: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          placement_test_id: string
          skill: string
          sort_order: number
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          placement_test_id: string
          skill: string
          sort_order?: number
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          placement_test_id?: string
          skill?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "placement_test_sections_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_test_sections_placement_test_id_fkey"
            columns: ["placement_test_id"]
            isOneToOne: false
            referencedRelation: "placement_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_tests: {
        Row: {
          allow_retake: boolean
          created_at: string
          created_by: string | null
          description: string | null
          duration: number
          id: string
          level_thresholds: Json | null
          link_expiry_hours: number | null
          name: string
          show_results: boolean
          skills: Json
          status: string
          updated_at: string
        }
        Insert: {
          allow_retake?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number
          id?: string
          level_thresholds?: Json | null
          link_expiry_hours?: number | null
          name: string
          show_results?: boolean
          skills?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          allow_retake?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number
          id?: string
          level_thresholds?: Json | null
          link_expiry_hours?: number | null
          name?: string
          show_results?: boolean
          skills?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_exercises: {
        Row: {
          allow_retake: boolean
          content: Json | null
          course_level: string | null
          created_at: string
          created_by: string
          description: string | null
          difficulty: string
          id: string
          program: string | null
          question_type: string
          question_types: Json | null
          questions: Json | null
          scoring_mode: string
          skill: string
          status: string
          timer_duration: number
          timer_enabled: boolean
          title: string
          updated_at: string
        }
        Insert: {
          allow_retake?: boolean
          content?: Json | null
          course_level?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          difficulty?: string
          id?: string
          program?: string | null
          question_type: string
          question_types?: Json | null
          questions?: Json | null
          scoring_mode?: string
          skill: string
          status?: string
          timer_duration?: number
          timer_enabled?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          allow_retake?: boolean
          content?: Json | null
          course_level?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          id?: string
          program?: string | null
          question_type?: string
          question_types?: Json | null
          questions?: Json | null
          scoring_mode?: string
          skill?: string
          status?: string
          timer_duration?: number
          timer_enabled?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_results: {
        Row: {
          answers: Json | null
          correct_answers: number
          created_at: string
          difficulty: string
          exercise_id: string
          exercise_title: string
          id: string
          question_type: string
          score: number | null
          skill: string
          time_spent: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          correct_answers?: number
          created_at?: string
          difficulty: string
          exercise_id: string
          exercise_title: string
          id?: string
          question_type: string
          score?: number | null
          skill: string
          time_spent?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          correct_answers?: number
          created_at?: string
          difficulty?: string
          exercise_id?: string
          exercise_title?: string
          id?: string
          question_type?: string
          score?: number | null
          skill?: string
          time_spent?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          organization: string | null
          phone: string | null
          referral_code: string | null
          referral_source: string | null
          target_ielts: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          organization?: string | null
          phone?: string | null
          referral_code?: string | null
          referral_source?: string | null
          target_ielts?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          phone?: string | null
          referral_code?: string | null
          referral_source?: string | null
          target_ielts?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prospect_results: {
        Row: {
          answers: Json | null
          correct_answers: number | null
          created_at: string
          id: string
          prospect_id: string
          score: number | null
          section_id: string | null
          section_type: string
          time_spent: number | null
          total_questions: number | null
        }
        Insert: {
          answers?: Json | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          prospect_id: string
          score?: number | null
          section_id?: string | null
          section_type: string
          time_spent?: number | null
          total_questions?: number | null
        }
        Update: {
          answers?: Json | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          prospect_id?: string
          score?: number | null
          section_id?: string | null
          section_type?: string
          time_spent?: number | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_results_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_results_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "placement_test_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          full_name: string
          id: string
          phone: string | null
          placement_test_id: string | null
          source: string
          source_id: string | null
          status: string
          suggested_level: string | null
          token: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          placement_test_id?: string | null
          source?: string
          source_id?: string | null
          status?: string
          suggested_level?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          placement_test_id?: string | null
          source?: string
          source_id?: string | null
          status?: string
          suggested_level?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_placement_test_id_fkey"
            columns: ["placement_test_id"]
            isOneToOne: false
            referencedRelation: "placement_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      question_groups: {
        Row: {
          choices: Json | null
          completion_paragraph: string | null
          created_at: string
          description: string | null
          end_question_number: number
          id: string
          part_id: string
          question_type: string
          start_question_number: number
          title: string
        }
        Insert: {
          choices?: Json | null
          completion_paragraph?: string | null
          created_at?: string
          description?: string | null
          end_question_number: number
          id?: string
          part_id: string
          question_type: string
          start_question_number: number
          title: string
        }
        Update: {
          choices?: Json | null
          completion_paragraph?: string | null
          created_at?: string
          description?: string | null
          end_question_number?: number
          id?: string
          part_id?: string
          question_type?: string
          start_question_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_groups_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          choices: Json | null
          correct_answer: string
          created_at: string
          explain: string | null
          id: string
          passage_evidence: string | null
          points: number | null
          question_group_id: string
          question_number: number
          text: string | null
          title: string | null
        }
        Insert: {
          choices?: Json | null
          correct_answer: string
          created_at?: string
          explain?: string | null
          id?: string
          passage_evidence?: string | null
          points?: number | null
          question_group_id: string
          question_number: number
          text?: string | null
          title?: string | null
        }
        Update: {
          choices?: Json | null
          correct_answer?: string
          created_at?: string
          explain?: string | null
          id?: string
          passage_evidence?: string | null
          points?: number | null
          question_group_id?: string
          question_number?: number
          text?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_question_group_id_fkey"
            columns: ["question_group_id"]
            isOneToOne: false
            referencedRelation: "question_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_tags: {
        Row: {
          created_at: string
          created_by: string
          id: string
          resource_id: string
          resource_type: string
          tag: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          resource_id: string
          resource_type: string
          tag: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          resource_id?: string
          resource_type?: string
          tag?: string
        }
        Relationships: []
      }
      saved_questions: {
        Row: {
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      score_conversion: {
        Row: {
          band_score: number
          created_at: string
          id: string
          max_marks: number
          min_marks: number
          skill: string
          updated_at: string
        }
        Insert: {
          band_score: number
          created_at?: string
          id?: string
          max_marks: number
          min_marks: number
          skill: string
          updated_at?: string
        }
        Update: {
          band_score?: number
          created_at?: string
          id?: string
          max_marks?: number
          min_marks?: number
          skill?: string
          updated_at?: string
        }
        Relationships: []
      }
      speaking_feedback: {
        Row: {
          comment: string | null
          created_at: string
          fluency_coherence: number | null
          grammar_accuracy: number | null
          id: string
          lexical_resource: number | null
          overall_band: number | null
          part_key: string
          pronunciation: number | null
          result_id: string
          result_type: string
          score: number | null
          student_id: string
          teacher_id: string
          timestamps: Json | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          fluency_coherence?: number | null
          grammar_accuracy?: number | null
          id?: string
          lexical_resource?: number | null
          overall_band?: number | null
          part_key: string
          pronunciation?: number | null
          result_id: string
          result_type?: string
          score?: number | null
          student_id: string
          teacher_id: string
          timestamps?: Json | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          fluency_coherence?: number | null
          grammar_accuracy?: number | null
          id?: string
          lexical_resource?: number | null
          overall_band?: number | null
          part_key?: string
          pronunciation?: number | null
          result_id?: string
          result_type?: string
          score?: number | null
          student_id?: string
          teacher_id?: string
          timestamps?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      student_activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          student_user_id: string
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          student_user_id: string
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          student_user_id?: string
          title?: string
        }
        Relationships: []
      }
      student_field_access: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          field_group: string
          id: string
          role: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          field_group: string
          id?: string
          role: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          field_group?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      student_notes: {
        Row: {
          author_id: string
          author_role: string
          body: string
          category: string
          class_id: string | null
          created_at: string
          id: string
          is_public: boolean
          pinned: boolean
          student_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_role: string
          body: string
          category?: string
          class_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          pinned?: boolean
          student_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_role?: string
          body?: string
          category?: string
          class_id?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          pinned?: boolean
          student_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "synced_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payments: {
        Row: {
          amount: number
          class_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          status: string
          student_id: string
          synced_from_teachngo: boolean | null
        }
        Insert: {
          amount?: number
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          student_id: string
          synced_from_teachngo?: boolean | null
        }
        Update: {
          amount?: number
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          student_id?: string
          synced_from_teachngo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "synced_students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_questions: {
        Row: {
          body: string | null
          class_id: string | null
          context_detail: Json | null
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          image_url: string | null
          response: string | null
          response_at: string | null
          status: string
          student_id: string
          teacher_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          class_id?: string | null
          context_detail?: Json | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          response?: string | null
          response_at?: string | null
          status?: string
          student_id: string
          teacher_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          class_id?: string | null
          context_detail?: Json | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          response?: string | null
          response_at?: string | null
          status?: string
          student_id?: string
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_reports: {
        Row: {
          created_at: string
          generated_by: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          report_data: Json
          share_token: string
          student_id: string
          teacher_comment: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_by: string
          id?: string
          period_end: string
          period_start: string
          period_type?: string
          report_data?: Json
          share_token?: string
          student_id: string
          teacher_comment?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_by?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          report_data?: Json
          share_token?: string
          student_id?: string
          teacher_comment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_plan_entries: {
        Row: {
          actual_content: string | null
          assessment_ids: Json | null
          attendance: Json | null
          class_note: string | null
          class_note_files: Json | null
          class_note_visible: boolean | null
          completed_at: string | null
          created_at: string
          day_of_week: string | null
          end_time: string | null
          entry_date: string
          exercise_ids: Json | null
          flashcard_set_ids: Json | null
          homework: string
          id: string
          is_makeup: boolean | null
          links: Json
          plan_id: string
          plan_status: string | null
          room: string | null
          session_number: number | null
          session_title: string | null
          session_type: string | null
          skills: Json
          start_time: string | null
          student_note: Json | null
          updated_at: string
          vocab_game_ids: Json | null
        }
        Insert: {
          actual_content?: string | null
          assessment_ids?: Json | null
          attendance?: Json | null
          class_note?: string | null
          class_note_files?: Json | null
          class_note_visible?: boolean | null
          completed_at?: string | null
          created_at?: string
          day_of_week?: string | null
          end_time?: string | null
          entry_date: string
          exercise_ids?: Json | null
          flashcard_set_ids?: Json | null
          homework?: string
          id?: string
          is_makeup?: boolean | null
          links?: Json
          plan_id: string
          plan_status?: string | null
          room?: string | null
          session_number?: number | null
          session_title?: string | null
          session_type?: string | null
          skills?: Json
          start_time?: string | null
          student_note?: Json | null
          updated_at?: string
          vocab_game_ids?: Json | null
        }
        Update: {
          actual_content?: string | null
          assessment_ids?: Json | null
          attendance?: Json | null
          class_note?: string | null
          class_note_files?: Json | null
          class_note_visible?: boolean | null
          completed_at?: string | null
          created_at?: string
          day_of_week?: string | null
          end_time?: string | null
          entry_date?: string
          exercise_ids?: Json | null
          flashcard_set_ids?: Json | null
          homework?: string
          id?: string
          is_makeup?: boolean | null
          links?: Json
          plan_id?: string
          plan_status?: string | null
          room?: string | null
          session_number?: number | null
          session_title?: string | null
          session_type?: string | null
          skills?: Json
          start_time?: string | null
          student_note?: Json | null
          updated_at?: string
          vocab_game_ids?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_template_entries: {
        Row: {
          assessment_ids: Json
          class_note: string
          class_note_files: Json
          class_note_visible: boolean
          created_at: string
          day_offset: number | null
          exercise_ids: Json
          flashcard_set_ids: Json
          homework: string
          id: string
          links: Json
          session_order: number
          session_type: string | null
          skills: Json
          template_id: string
          updated_at: string
        }
        Insert: {
          assessment_ids?: Json
          class_note?: string
          class_note_files?: Json
          class_note_visible?: boolean
          created_at?: string
          day_offset?: number | null
          exercise_ids?: Json
          flashcard_set_ids?: Json
          homework?: string
          id?: string
          links?: Json
          session_order?: number
          session_type?: string | null
          skills?: Json
          template_id: string
          updated_at?: string
        }
        Update: {
          assessment_ids?: Json
          class_note?: string
          class_note_files?: Json
          class_note_visible?: boolean
          created_at?: string
          day_offset?: number | null
          exercise_ids?: Json
          flashcard_set_ids?: Json
          homework?: string
          id?: string
          links?: Json
          session_order?: number
          session_type?: string | null
          skills?: Json
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_template_entries_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "study_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_templates: {
        Row: {
          assigned_level: string | null
          created_at: string
          created_by: string | null
          current_score: Json
          description: string | null
          exercise_ids: Json
          flashcard_set_ids: Json
          id: string
          materials_links: Json
          plan_type: string
          program: string | null
          schedule_pattern: Json | null
          session_duration: number
          skills: Json
          status: string
          target_score: Json
          teacher_notes: string
          template_name: string
          total_sessions: number
          updated_at: string
        }
        Insert: {
          assigned_level?: string | null
          created_at?: string
          created_by?: string | null
          current_score?: Json
          description?: string | null
          exercise_ids?: Json
          flashcard_set_ids?: Json
          id?: string
          materials_links?: Json
          plan_type?: string
          program?: string | null
          schedule_pattern?: Json | null
          session_duration?: number
          skills?: Json
          status?: string
          target_score?: Json
          teacher_notes?: string
          template_name: string
          total_sessions?: number
          updated_at?: string
        }
        Update: {
          assigned_level?: string | null
          created_at?: string
          created_by?: string | null
          current_score?: Json
          description?: string | null
          exercise_ids?: Json
          flashcard_set_ids?: Json
          id?: string
          materials_links?: Json
          plan_type?: string
          program?: string | null
          schedule_pattern?: Json | null
          session_duration?: number
          skills?: Json
          status?: string
          target_score?: Json
          teacher_notes?: string
          template_name?: string
          total_sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          assigned_level: string | null
          class_ids: Json | null
          created_at: string
          created_by: string | null
          current_score: Json
          end_date: string | null
          excluded_dates: Json | null
          exercise_ids: Json | null
          flashcard_set_ids: Json | null
          id: string
          is_template_dirty: boolean
          materials_links: Json | null
          plan_name: string | null
          plan_type: string | null
          program: string | null
          progress: number
          schedule_pattern: Json | null
          session_duration: number | null
          skills: Json | null
          source_template_id: string | null
          start_date: string | null
          status: string
          student_ids: Json | null
          target_score: Json
          teacher_notes: string | null
          teachngo_student_id: string | null
          test_date: string | null
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          assigned_level?: string | null
          class_ids?: Json | null
          created_at?: string
          created_by?: string | null
          current_score?: Json
          end_date?: string | null
          excluded_dates?: Json | null
          exercise_ids?: Json | null
          flashcard_set_ids?: Json | null
          id?: string
          is_template_dirty?: boolean
          materials_links?: Json | null
          plan_name?: string | null
          plan_type?: string | null
          program?: string | null
          progress?: number
          schedule_pattern?: Json | null
          session_duration?: number | null
          skills?: Json | null
          source_template_id?: string | null
          start_date?: string | null
          status?: string
          student_ids?: Json | null
          target_score?: Json
          teacher_notes?: string | null
          teachngo_student_id?: string | null
          test_date?: string | null
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          assigned_level?: string | null
          class_ids?: Json | null
          created_at?: string
          created_by?: string | null
          current_score?: Json
          end_date?: string | null
          excluded_dates?: Json | null
          exercise_ids?: Json | null
          flashcard_set_ids?: Json | null
          id?: string
          is_template_dirty?: boolean
          materials_links?: Json | null
          plan_name?: string | null
          plan_type?: string | null
          program?: string | null
          progress?: number
          schedule_pattern?: Json | null
          session_duration?: number | null
          skills?: Json | null
          source_template_id?: string | null
          start_date?: string | null
          status?: string
          student_ids?: Json | null
          target_score?: Json
          teacher_notes?: string | null
          teachngo_student_id?: string | null
          test_date?: string | null
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "study_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      teacher_emails: {
        Row: {
          body_html: string
          body_text: string | null
          class_id: string | null
          created_at: string
          failed_count: number
          id: string
          metadata: Json | null
          recipient_emails: string[]
          reply_to: string | null
          sender_email: string | null
          sender_name: string
          sender_user_id: string
          sent_count: number
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          class_id?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          metadata?: Json | null
          recipient_emails?: string[]
          reply_to?: string | null
          sender_email?: string | null
          sender_name: string
          sender_user_id: string
          sent_count?: number
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          class_id?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          metadata?: Json | null
          recipient_emails?: string[]
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string
          sender_user_id?: string
          sent_count?: number
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          can_use_ai_grading: boolean | null
          classes: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          linked_user_id: string | null
          notes: string | null
          phone: string | null
          raw_data: Json | null
          status: string
          subjects: string | null
          teachngo_staff_id: string | null
          updated_at: string
        }
        Insert: {
          can_use_ai_grading?: boolean | null
          classes?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          raw_data?: Json | null
          status?: string
          subjects?: string | null
          teachngo_staff_id?: string | null
          updated_at?: string
        }
        Update: {
          can_use_ai_grading?: boolean | null
          classes?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          phone?: string | null
          raw_data?: Json | null
          status?: string
          subjects?: string | null
          teachngo_staff_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teachngo_attendance: {
        Row: {
          attendance_status: string | null
          course_name: string | null
          created_at: string
          id: string
          lesson_date: string | null
          notes: string | null
          raw_data: Json | null
          student_name: string
          synced_at: string
          teachngo_student_id: string
        }
        Insert: {
          attendance_status?: string | null
          course_name?: string | null
          created_at?: string
          id?: string
          lesson_date?: string | null
          notes?: string | null
          raw_data?: Json | null
          student_name: string
          synced_at?: string
          teachngo_student_id: string
        }
        Update: {
          attendance_status?: string | null
          course_name?: string | null
          created_at?: string
          id?: string
          lesson_date?: string | null
          notes?: string | null
          raw_data?: Json | null
          student_name?: string
          synced_at?: string
          teachngo_student_id?: string
        }
        Relationships: []
      }
      teachngo_class_students: {
        Row: {
          class_id: string
          created_at: string
          enrollment_date: string | null
          id: string
          status: string | null
          teachngo_student_id: string
          unenrollment_date: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          status?: string | null
          teachngo_student_id: string
          unenrollment_date?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          status?: string | null
          teachngo_student_id?: string
          unenrollment_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachngo_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teachngo_classes: {
        Row: {
          class_name: string
          class_type: string | null
          course_title: string | null
          created_at: string
          data_source: string | null
          default_end_time: string | null
          default_start_time: string | null
          description: string | null
          end_date: string | null
          id: string
          leaderboard_enabled: boolean
          level: string | null
          max_students: number | null
          program: string | null
          raw_data: Json | null
          room: string | null
          schedule: string | null
          start_date: string | null
          status: string | null
          study_plan_id: string | null
          synced_at: string
          teacher_id: string | null
          teacher_name: string | null
          teachngo_class_id: string | null
          updated_at: string
        }
        Insert: {
          class_name: string
          class_type?: string | null
          course_title?: string | null
          created_at?: string
          data_source?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          leaderboard_enabled?: boolean
          level?: string | null
          max_students?: number | null
          program?: string | null
          raw_data?: Json | null
          room?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          study_plan_id?: string | null
          synced_at?: string
          teacher_id?: string | null
          teacher_name?: string | null
          teachngo_class_id?: string | null
          updated_at?: string
        }
        Update: {
          class_name?: string
          class_type?: string | null
          course_title?: string | null
          created_at?: string
          data_source?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          leaderboard_enabled?: boolean
          level?: string | null
          max_students?: number | null
          program?: string | null
          raw_data?: Json | null
          room?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          study_plan_id?: string | null
          synced_at?: string
          teacher_id?: string | null
          teacher_name?: string | null
          teachngo_class_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachngo_classes_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachngo_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachngo_students: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          course_names: string | null
          created_at: string
          current_level: string | null
          data_source: string | null
          date_of_birth: string | null
          email: string | null
          enrollment_date: string | null
          entry_band: number | null
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          id_number: string | null
          is_active: boolean | null
          linked_user_id: string | null
          manual_overrides: Json
          nationality: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          raw_data: Json | null
          registration_date: string | null
          school_name: string | null
          source: string | null
          status: string | null
          synced_at: string
          tags: Json | null
          target_band: number | null
          target_exam_date: string | null
          teachngo_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          course_names?: string | null
          created_at?: string
          current_level?: string | null
          data_source?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          entry_band?: number | null
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          linked_user_id?: string | null
          manual_overrides?: Json
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          raw_data?: Json | null
          registration_date?: string | null
          school_name?: string | null
          source?: string | null
          status?: string | null
          synced_at?: string
          tags?: Json | null
          target_band?: number | null
          target_exam_date?: string | null
          teachngo_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          course_names?: string | null
          created_at?: string
          current_level?: string | null
          data_source?: string | null
          date_of_birth?: string | null
          email?: string | null
          enrollment_date?: string | null
          entry_band?: number | null
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          linked_user_id?: string | null
          manual_overrides?: Json
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          raw_data?: Json | null
          registration_date?: string | null
          school_name?: string | null
          source?: string | null
          status?: string | null
          synced_at?: string
          tags?: Json | null
          target_band?: number | null
          target_exam_date?: string | null
          teachngo_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      test_results: {
        Row: {
          answers: Json | null
          assessment_id: string
          assessment_name: string
          book_name: string | null
          correct_answers: number | null
          created_at: string
          id: string
          parts_data: Json | null
          score: number | null
          section_type: string
          speaking_parts: Json | null
          time_spent: number
          total_questions: number | null
          user_id: string
          writing_tasks: Json | null
        }
        Insert: {
          answers?: Json | null
          assessment_id: string
          assessment_name: string
          book_name?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          parts_data?: Json | null
          score?: number | null
          section_type: string
          speaking_parts?: Json | null
          time_spent?: number
          total_questions?: number | null
          user_id: string
          writing_tasks?: Json | null
        }
        Update: {
          answers?: Json | null
          assessment_id?: string
          assessment_name?: string
          book_name?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          parts_data?: Json | null
          score?: number | null
          section_type?: string
          speaking_parts?: Json | null
          time_spent?: number
          total_questions?: number | null
          user_id?: string
          writing_tasks?: Json | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_grading_enabled: boolean | null
          exam_date: string | null
          id: string
          notification_hour: number | null
          notification_hours: number[] | null
          notifications_enabled: boolean | null
          setup_completed: boolean | null
          target_listening: string | null
          target_overall: string | null
          target_reading: string | null
          target_speaking: string | null
          target_writing: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_grading_enabled?: boolean | null
          exam_date?: string | null
          id?: string
          notification_hour?: number | null
          notification_hours?: number[] | null
          notifications_enabled?: boolean | null
          setup_completed?: boolean | null
          target_listening?: string | null
          target_overall?: string | null
          target_reading?: string | null
          target_speaking?: string | null
          target_writing?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_grading_enabled?: boolean | null
          exam_date?: string | null
          id?: string
          notification_hour?: number | null
          notification_hours?: number[] | null
          notifications_enabled?: boolean | null
          setup_completed?: boolean | null
          target_listening?: string | null
          target_overall?: string | null
          target_reading?: string | null
          target_speaking?: string | null
          target_writing?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workdrive_sync: {
        Row: {
          audio_url: string
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string | null
          id: string
          updated_at: string
          workdrive_file_id: string
          workdrive_folder_id: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          entity_id: string
          entity_type: string
          file_name?: string | null
          id?: string
          updated_at?: string
          workdrive_file_id: string
          workdrive_folder_id?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string | null
          id?: string
          updated_at?: string
          workdrive_file_id?: string
          workdrive_folder_id?: string | null
        }
        Relationships: []
      }
      writing_annotations: {
        Row: {
          annotation_type: string
          category: string | null
          comment: string | null
          correction: string | null
          created_at: string
          end_offset: number
          feedback_id: string
          id: string
          original_text: string
          start_offset: number
        }
        Insert: {
          annotation_type: string
          category?: string | null
          comment?: string | null
          correction?: string | null
          created_at?: string
          end_offset: number
          feedback_id: string
          id?: string
          original_text: string
          start_offset: number
        }
        Update: {
          annotation_type?: string
          category?: string | null
          comment?: string | null
          correction?: string | null
          created_at?: string
          end_offset?: number
          feedback_id?: string
          id?: string
          original_text?: string
          start_offset?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_annotations_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "writing_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_feedback: {
        Row: {
          coherence_cohesion: number | null
          comment: string | null
          created_at: string
          feedback_source: string | null
          grammar_accuracy: number | null
          id: string
          lexical_resource: number | null
          overall_band: number | null
          result_id: string
          share_token: string
          status: string
          student_id: string
          task_achievement: number | null
          task_key: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          coherence_cohesion?: number | null
          comment?: string | null
          created_at?: string
          feedback_source?: string | null
          grammar_accuracy?: number | null
          id?: string
          lexical_resource?: number | null
          overall_band?: number | null
          result_id: string
          share_token?: string
          status?: string
          student_id: string
          task_achievement?: number | null
          task_key: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          coherence_cohesion?: number | null
          comment?: string | null
          created_at?: string
          feedback_source?: string | null
          grammar_accuracy?: number | null
          id?: string
          lexical_resource?: number | null
          overall_band?: number | null
          result_id?: string
          share_token?: string
          status?: string
          student_id?: string
          task_achievement?: number | null
          task_key?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      class_weekly_leaderboard: {
        Row: {
          active_days: number | null
          class_id: string | null
          full_name: string | null
          user_id: string | null
          weekly_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teachngo_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_exercises_public: {
        Row: {
          content: Json | null
          course_level: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string | null
          program: string | null
          question_type: string | null
          question_types: Json | null
          questions: Json | null
          scoring_mode: string | null
          skill: string | null
          status: string | null
          timer_duration: number | null
          timer_enabled: boolean | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          course_level?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string | null
          program?: string | null
          question_type?: string | null
          question_types?: Json | null
          questions?: never
          scoring_mode?: string | null
          skill?: string | null
          status?: string | null
          timer_duration?: number | null
          timer_enabled?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          course_level?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string | null
          program?: string | null
          question_type?: string | null
          question_types?: Json | null
          questions?: never
          scoring_mode?: string | null
          skill?: string | null
          status?: string | null
          timer_duration?: number | null
          timer_enabled?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions_safe: {
        Row: {
          choices: Json | null
          created_at: string | null
          id: string | null
          question_group_id: string | null
          question_number: number | null
          text: string | null
          title: string | null
        }
        Insert: {
          choices?: Json | null
          created_at?: string | null
          id?: string | null
          question_group_id?: string | null
          question_number?: number | null
          text?: string | null
          title?: string | null
        }
        Update: {
          choices?: Json | null
          created_at?: string | null
          id?: string | null
          question_group_id?: string | null
          question_number?: number | null
          text?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_question_group_id_fkey"
            columns: ["question_group_id"]
            isOneToOne: false
            referencedRelation: "question_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_assign_class_levels: { Args: never; Returns: Json }
      auto_link_class_teachers: { Args: never; Returns: Json }
      auto_link_teachers: { Args: never; Returns: Json }
      auto_link_teachngo_students: { Args: never; Returns: Json }
      cleanup_old_activity_feed: { Args: never; Returns: undefined }
      clone_template_to_plan: {
        Args: {
          p_class_ids?: string[]
          p_end_date?: string
          p_excluded_dates?: string[]
          p_plan_name_override?: string
          p_schedule_pattern?: Json
          p_start_date?: string
          p_student_ids?: string[]
          p_template_id: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_class_overview: { Args: { p_class_id: string }; Returns: Json }
      get_exercise_summaries: {
        Args: { p_ids: string[] }
        Returns: {
          course_level: string
          id: string
          program: string
          skill: string
          title: string
        }[]
      }
      get_game_leaderboard_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_published_exercise: {
        Args: { p_id: string }
        Returns: {
          allow_retake: boolean
          content: Json
          course_level: string
          created_at: string
          created_by: string
          description: string
          difficulty: string
          id: string
          program: string
          question_type: string
          question_types: Json
          questions: Json
          scoring_mode: string
          skill: string
          status: string
          timer_duration: number
          timer_enabled: boolean
          title: string
          updated_at: string
        }[]
      }
      get_published_exercises: {
        Args: never
        Returns: {
          allow_retake: boolean
          content: Json
          course_level: string
          created_at: string
          created_by: string
          description: string
          difficulty: string
          id: string
          program: string
          question_type: string
          question_types: Json
          questions: Json
          scoring_mode: string
          skill: string
          status: string
          timer_duration: number
          timer_enabled: boolean
          title: string
          updated_at: string
        }[]
      }
      get_report_by_token: { Args: { p_token: string }; Returns: Json }
      get_school_overview: { Args: never; Returns: Json }
      get_student_course_grade: {
        Args: { p_class_id: string; p_user_id: string }
        Returns: Json
      }
      get_student_error_stats: {
        Args: { p_days?: number; p_skill?: string; p_user_id: string }
        Returns: Json
      }
      get_student_lifetime: { Args: { p_user_id: string }; Returns: Json }
      get_student_profile: { Args: { p_student_id: string }; Returns: Json }
      get_teacher_overview: {
        Args: { p_teacher_user_id?: string }
        Returns: Json
      }
      get_user_emails: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_writing_feedback_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_activity: {
        Args: {
          p_date: string
          p_minutes: number
          p_skill?: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_class_taught_by_me: { Args: { _class_id: string }; Returns: boolean }
      is_my_class: { Args: { _class_id: string }; Returns: boolean }
      is_my_class_student: {
        Args: { _teachngo_student_id: string }
        Returns: boolean
      }
      is_my_teachngo_student: {
        Args: { _teachngo_student_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_taught_class_ids: { Args: never; Returns: string[] }
      my_taught_student_ids: { Args: never; Returns: string[] }
      my_teachngo_student_ids: { Args: never; Returns: string[] }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      scrub_exercise_questions: { Args: { qs: Json }; Returns: Json }
      sync_plan_to_template: { Args: { p_plan_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user" | "guest" | "teacher"
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
      app_role: ["super_admin", "admin", "user", "guest", "teacher"],
    },
  },
} as const
