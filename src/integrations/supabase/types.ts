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
      addendum_template_fields: {
        Row: {
          created_at: string
          default_value: Json | null
          field_group: string | null
          field_key: string
          field_type: Database["public"]["Enums"]["contract_field_type"]
          help_text: string | null
          id: string
          label: string
          options: Json | null
          required: boolean
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          field_group?: string | null
          field_key: string
          field_type: Database["public"]["Enums"]["contract_field_type"]
          help_text?: string | null
          id?: string
          label: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          field_group?: string | null
          field_key?: string
          field_type?: Database["public"]["Enums"]["contract_field_type"]
          help_text?: string | null
          id?: string
          label?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addendum_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "addendum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      addendum_templates: {
        Row: {
          body_md: string
          created_at: string
          default_auto_archive: boolean
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          created_at?: string
          default_auto_archive?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          default_auto_archive?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_session_audit_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          session_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          session_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_session_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_session_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_sessions_pending_lock"
            referencedColumns: ["session_id"]
          },
        ]
      }
      app_attendance: {
        Row: {
          attendance_status: string
          class_id: string | null
          created_at: string
          id: string
          lesson_date: string
          notes: string | null
          recorded_by: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_status?: string
          class_id?: string | null
          created_at?: string
          id?: string
          lesson_date: string
          notes?: string | null
          recorded_by?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_status?: string
          class_id?: string | null
          created_at?: string
          id?: string
          lesson_date?: string
          notes?: string | null
          recorded_by?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_attendance_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_attendance_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_attendance_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "app_attendance_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_attendance_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "app_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "app_students"
            referencedColumns: ["id"]
          },
        ]
      }
      app_class_students: {
        Row: {
          class_id: string
          created_at: string
          enrollment_date: string | null
          id: string
          status: string
          student_id: string
          unenrollment_date: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          status?: string
          student_id: string
          unenrollment_date?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          enrollment_date?: string | null
          id?: string
          status?: string
          student_id?: string
          unenrollment_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "app_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "app_class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "app_students"
            referencedColumns: ["id"]
          },
        ]
      }
      app_classes: {
        Row: {
          allow_self_checkin: boolean
          branch: string | null
          cancellation_reason: string | null
          class_code: string | null
          class_name: string
          class_type: string | null
          course_id: string | null
          course_title: string | null
          created_at: string
          data_source: string | null
          default_end_time: string | null
          default_mode: string | null
          default_start_time: string | null
          description: string | null
          end_date: string | null
          id: string
          leaderboard_enabled: boolean
          level: string | null
          lifecycle_status: Database["public"]["Enums"]["class_lifecycle_status"]
          max_students: number | null
          mode: string | null
          name: string | null
          notes: string | null
          price_vnd_override: number | null
          program: string | null
          room: string | null
          room_id: string | null
          schedule: string | null
          start_date: string | null
          status: string
          status_changed_at: string | null
          student_count: number | null
          study_plan_id: string | null
          teacher_id: string | null
          teacher_name: string | null
          updated_at: string
        }
        Insert: {
          allow_self_checkin?: boolean
          branch?: string | null
          cancellation_reason?: string | null
          class_code?: string | null
          class_name: string
          class_type?: string | null
          course_id?: string | null
          course_title?: string | null
          created_at?: string
          data_source?: string | null
          default_end_time?: string | null
          default_mode?: string | null
          default_start_time?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          leaderboard_enabled?: boolean
          level?: string | null
          lifecycle_status?: Database["public"]["Enums"]["class_lifecycle_status"]
          max_students?: number | null
          mode?: string | null
          name?: string | null
          notes?: string | null
          price_vnd_override?: number | null
          program?: string | null
          room?: string | null
          room_id?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string
          status_changed_at?: string | null
          student_count?: number | null
          study_plan_id?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Update: {
          allow_self_checkin?: boolean
          branch?: string | null
          cancellation_reason?: string | null
          class_code?: string | null
          class_name?: string
          class_type?: string | null
          course_id?: string | null
          course_title?: string | null
          created_at?: string
          data_source?: string | null
          default_end_time?: string | null
          default_mode?: string | null
          default_start_time?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          leaderboard_enabled?: boolean
          level?: string | null
          lifecycle_status?: Database["public"]["Enums"]["class_lifecycle_status"]
          max_students?: number | null
          mode?: string | null
          name?: string | null
          notes?: string | null
          price_vnd_override?: number | null
          program?: string | null
          room?: string | null
          room_id?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string
          status_changed_at?: string | null
          student_count?: number | null
          study_plan_id?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      app_students: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          current_level: string | null
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
          is_active: boolean | null
          legacy_student_code: string | null
          linked_user_id: string | null
          manual_overrides: Json | null
          nationality: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          registration_date: string | null
          school_name: string | null
          source: string | null
          status: string | null
          student_code: string | null
          tags: Json | null
          target_band: number | null
          target_exam_date: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_level?: string | null
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
          is_active?: boolean | null
          legacy_student_code?: string | null
          linked_user_id?: string | null
          manual_overrides?: Json | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          registration_date?: string | null
          school_name?: string | null
          source?: string | null
          status?: string | null
          student_code?: string | null
          tags?: Json | null
          target_band?: number | null
          target_exam_date?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_level?: string | null
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
          is_active?: boolean | null
          legacy_student_code?: string | null
          linked_user_id?: string | null
          manual_overrides?: Json | null
          nationality?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          registration_date?: string | null
          school_name?: string | null
          source?: string | null
          status?: string | null
          student_code?: string | null
          tags?: Json | null
          target_band?: number | null
          target_exam_date?: string | null
          updated_at?: string
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
      attendance: {
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
      attendance_audit_log: {
        Row: {
          action: string
          actor_uid: string | null
          created_at: string
          id: string
          payload: Json | null
          reason: string | null
          session_id: string
        }
        Insert: {
          action: string
          actor_uid?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          reason?: string | null
          session_id: string
        }
        Update: {
          action?: string
          actor_uid?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          reason?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_sessions_pending_lock"
            referencedColumns: ["session_id"]
          },
        ]
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
      brand_assets: {
        Row: {
          asset_key: string
          asset_type: Database["public"]["Enums"]["brand_asset_type"]
          created_at: string
          description: string | null
          display_name: string
          file_size: number | null
          height: number | null
          id: string
          is_active: boolean
          mime_type: string | null
          public_url: string
          sort_order: number
          storage_path: string
          updated_at: string
          updated_by: string | null
          version: number
          width: number | null
        }
        Insert: {
          asset_key: string
          asset_type?: Database["public"]["Enums"]["brand_asset_type"]
          created_at?: string
          description?: string | null
          display_name: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          public_url: string
          sort_order?: number
          storage_path: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          width?: number | null
        }
        Update: {
          asset_key?: string
          asset_type?: Database["public"]["Enums"]["brand_asset_type"]
          created_at?: string
          description?: string | null
          display_name?: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          public_url?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          width?: number | null
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
            foreignKeyName: "class_announcements_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_announcements_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_announcements_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_announcements_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_announcements_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          created_at: string
          drop_reason: string | null
          dropped_at: string | null
          enrolled_at: string
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          drop_reason?: string | null
          dropped_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          drop_reason?: string | null
          dropped_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_enrollments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "synced_students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_invitations: {
        Row: {
          class_id: string
          created_at: string
          email_sent_at: string | null
          id: string
          invited_at: string
          invited_by: string | null
          negotiation_message_admin: string | null
          negotiation_message_teacher: string | null
          negotiation_proposed_rate_amount_vnd: number | null
          negotiation_proposed_rate_unit: string | null
          negotiation_proposed_role: string | null
          negotiation_requested_at: string | null
          negotiation_responded_at: string | null
          negotiation_status: string
          proposed_rate_amount_vnd: number | null
          proposed_rate_unit:
            | Database["public"]["Enums"]["pay_rate_unit"]
            | null
          rate_override_reason: string | null
          reassigned_to: string | null
          reminder_sent_at: string | null
          respond_deadline: string | null
          responded_at: string | null
          response_note: string | null
          role: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          negotiation_message_admin?: string | null
          negotiation_message_teacher?: string | null
          negotiation_proposed_rate_amount_vnd?: number | null
          negotiation_proposed_rate_unit?: string | null
          negotiation_proposed_role?: string | null
          negotiation_requested_at?: string | null
          negotiation_responded_at?: string | null
          negotiation_status?: string
          proposed_rate_amount_vnd?: number | null
          proposed_rate_unit?:
            | Database["public"]["Enums"]["pay_rate_unit"]
            | null
          rate_override_reason?: string | null
          reassigned_to?: string | null
          reminder_sent_at?: string | null
          respond_deadline?: string | null
          responded_at?: string | null
          response_note?: string | null
          role?: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          negotiation_message_admin?: string | null
          negotiation_message_teacher?: string | null
          negotiation_proposed_rate_amount_vnd?: number | null
          negotiation_proposed_rate_unit?: string | null
          negotiation_proposed_role?: string | null
          negotiation_requested_at?: string | null
          negotiation_responded_at?: string | null
          negotiation_status?: string
          proposed_rate_amount_vnd?: number | null
          proposed_rate_unit?:
            | Database["public"]["Enums"]["pay_rate_unit"]
            | null
          rate_override_reason?: string | null
          reassigned_to?: string | null
          reminder_sent_at?: string | null
          respond_deadline?: string | null
          responded_at?: string | null
          response_note?: string | null
          role?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_invitations_reassigned_to_fkey"
            columns: ["reassigned_to"]
            isOneToOne: false
            referencedRelation: "class_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_invitations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          attendance_locked_at: string | null
          attendance_locked_by: string | null
          class_id: string
          created_at: string
          end_time: string
          id: string
          is_late_locked: boolean
          mode: string
          notes: string | null
          room: string | null
          room_id: string | null
          session_date: string
          session_number: number | null
          start_time: string
          status: string
          substitute_for: string | null
          ta_teacher_ids: string[]
          teacher_id: string | null
          teacher_reminder_sent_at: string | null
          updated_at: string
        }
        Insert: {
          attendance_locked_at?: string | null
          attendance_locked_by?: string | null
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          is_late_locked?: boolean
          mode?: string
          notes?: string | null
          room?: string | null
          room_id?: string | null
          session_date: string
          session_number?: number | null
          start_time: string
          status?: string
          substitute_for?: string | null
          ta_teacher_ids?: string[]
          teacher_id?: string | null
          teacher_reminder_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          attendance_locked_at?: string | null
          attendance_locked_by?: string | null
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          is_late_locked?: boolean
          mode?: string
          notes?: string | null
          room?: string | null
          room_id?: string | null
          session_date?: string
          session_number?: number | null
          start_time?: string
          status?: string
          substitute_for?: string | null
          ta_teacher_ids?: string[]
          teacher_id?: string | null
          teacher_reminder_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_substitute_for_fkey"
            columns: ["substitute_for"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_substitute_for_fkey"
            columns: ["substitute_for"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_sessions_substitute_for_fkey"
            columns: ["substitute_for"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      class_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          class_id: string
          from_status:
            | Database["public"]["Enums"]["class_lifecycle_status"]
            | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["class_lifecycle_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          class_id: string
          from_status?:
            | Database["public"]["Enums"]["class_lifecycle_status"]
            | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["class_lifecycle_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          class_id?: string
          from_status?:
            | Database["public"]["Enums"]["class_lifecycle_status"]
            | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["class_lifecycle_status"]
        }
        Relationships: []
      }
      class_students: {
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
        Relationships: []
      }
      class_teachers: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          class_id: string
          note: string | null
          role: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          class_id: string
          note?: string | null
          role?: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          class_id?: string
          note?: string | null
          role?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_teachers_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      contract_addendum_audit_log: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          addendum_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["addendum_status"] | null
          id: number
          ip_address: unknown
          notes: string | null
          payload: Json | null
          to_status: Database["public"]["Enums"]["addendum_status"] | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          addendum_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["addendum_status"] | null
          id?: number
          ip_address?: unknown
          notes?: string | null
          payload?: Json | null
          to_status?: Database["public"]["Enums"]["addendum_status"] | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          addendum_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["addendum_status"] | null
          id?: number
          ip_address?: unknown
          notes?: string | null
          payload?: Json | null
          to_status?: Database["public"]["Enums"]["addendum_status"] | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_addendum_audit_log_addendum_id_fkey"
            columns: ["addendum_id"]
            isOneToOne: false
            referencedRelation: "contract_addendums"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_addendum_pay_rates: {
        Row: {
          addendum_id: string
          archived_at: string | null
          created_at: string
          id: string
          max_threshold: number | null
          min_threshold: number | null
          notes: string | null
          program_id: string | null
          rate_amount_vnd: number
          rate_unit: Database["public"]["Enums"]["pay_rate_unit"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          addendum_id: string
          archived_at?: string | null
          created_at?: string
          id?: string
          max_threshold?: number | null
          min_threshold?: number | null
          notes?: string | null
          program_id?: string | null
          rate_amount_vnd: number
          rate_unit: Database["public"]["Enums"]["pay_rate_unit"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          addendum_id?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          max_threshold?: number | null
          min_threshold?: number | null
          notes?: string | null
          program_id?: string | null
          rate_amount_vnd?: number
          rate_unit?: Database["public"]["Enums"]["pay_rate_unit"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_addendum_pay_rates_addendum_id_fkey"
            columns: ["addendum_id"]
            isOneToOne: false
            referencedRelation: "contract_addendums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_addendum_pay_rates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_addendum_signatures: {
        Row: {
          addendum_id: string
          archived_at: string | null
          id: string
          ip_address: unknown
          party: Database["public"]["Enums"]["contract_party"]
          signature_image_url: string
          signed_at: string
          signed_by: string | null
          user_agent: string | null
        }
        Insert: {
          addendum_id: string
          archived_at?: string | null
          id?: string
          ip_address?: unknown
          party: Database["public"]["Enums"]["contract_party"]
          signature_image_url: string
          signed_at?: string
          signed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          addendum_id?: string
          archived_at?: string | null
          id?: string
          ip_address?: unknown
          party?: Database["public"]["Enums"]["contract_party"]
          signature_image_url?: string
          signed_at?: string
          signed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_addendum_signatures_addendum_id_fkey"
            columns: ["addendum_id"]
            isOneToOne: false
            referencedRelation: "contract_addendums"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_addendums: {
        Row: {
          addendum_number: string
          admin_signed_at: string | null
          auto_archive_on_activate: boolean
          body_md_snapshot: string
          contract_id: string
          created_at: string
          created_by: string | null
          custom_fields: Json
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          party_a_signer_user_id: string | null
          party_a_snapshot: Json
          party_b_snapshot: Json
          pdf_storage_path: string | null
          status: Database["public"]["Enums"]["addendum_status"]
          superseded_by_id: string | null
          teacher_signed_at: string | null
          template_fields_snapshot: Json
          template_id: string | null
          updated_at: string
        }
        Insert: {
          addendum_number: string
          admin_signed_at?: string | null
          auto_archive_on_activate?: boolean
          body_md_snapshot?: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          effective_from: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          party_a_signer_user_id?: string | null
          party_a_snapshot?: Json
          party_b_snapshot?: Json
          pdf_storage_path?: string | null
          status?: Database["public"]["Enums"]["addendum_status"]
          superseded_by_id?: string | null
          teacher_signed_at?: string | null
          template_fields_snapshot?: Json
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          addendum_number?: string
          admin_signed_at?: string | null
          auto_archive_on_activate?: boolean
          body_md_snapshot?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          party_a_signer_user_id?: string | null
          party_a_snapshot?: Json
          party_b_snapshot?: Json
          pdf_storage_path?: string | null
          status?: Database["public"]["Enums"]["addendum_status"]
          superseded_by_id?: string | null
          teacher_signed_at?: string | null
          template_fields_snapshot?: Json
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_addendums_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_addendums_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "contract_addendums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_addendums_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "addendum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_audit_log: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          contract_id: string
          created_at: string
          diff: Json
          event_type: string
          id: number
          ip_address: unknown
          message: string | null
          user_agent: string | null
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          contract_id: string
          created_at?: string
          diff?: Json
          event_type: string
          id?: number
          ip_address?: unknown
          message?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          contract_id?: string
          created_at?: string
          diff?: Json
          event_type?: string
          id?: number
          ip_address?: unknown
          message?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          contract_id: string
          created_at: string
          doc_label: string
          doc_type: string
          external_url: string | null
          id: string
          related_contract_id: string | null
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          doc_label: string
          doc_type: string
          external_url?: string | null
          id?: string
          related_contract_id?: string | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          doc_label?: string
          doc_type?: string
          external_url?: string | null
          id?: string
          related_contract_id?: string | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_pay_rates: {
        Row: {
          addendum_id: string | null
          archived_at: string | null
          contract_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          max_threshold: number | null
          min_threshold: number | null
          notes: string | null
          program_id: string | null
          rate_amount_vnd: number
          rate_unit: Database["public"]["Enums"]["pay_rate_unit"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          addendum_id?: string | null
          archived_at?: string | null
          contract_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          max_threshold?: number | null
          min_threshold?: number | null
          notes?: string | null
          program_id?: string | null
          rate_amount_vnd: number
          rate_unit: Database["public"]["Enums"]["pay_rate_unit"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          addendum_id?: string | null
          archived_at?: string | null
          contract_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          max_threshold?: number | null
          min_threshold?: number | null
          notes?: string | null
          program_id?: string | null
          rate_amount_vnd?: number
          rate_unit?: Database["public"]["Enums"]["pay_rate_unit"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_pay_rates_addendum_id_fkey"
            columns: ["addendum_id"]
            isOneToOne: false
            referencedRelation: "contract_addendums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_pay_rates_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_pay_rates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          archived_at: string | null
          contract_id: string
          id: string
          ip_address: unknown
          party: Database["public"]["Enums"]["contract_party"]
          signature_image_url: string
          signed_at: string
          signed_by: string | null
          user_agent: string | null
        }
        Insert: {
          archived_at?: string | null
          contract_id: string
          id?: string
          ip_address?: unknown
          party: Database["public"]["Enums"]["contract_party"]
          signature_image_url: string
          signed_at?: string
          signed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          archived_at?: string | null
          contract_id?: string
          id?: string
          ip_address?: unknown
          party?: Database["public"]["Enums"]["contract_party"]
          signature_image_url?: string
          signed_at?: string
          signed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_fields: {
        Row: {
          created_at: string
          default_value: Json | null
          field_group: string | null
          field_key: string
          field_type: Database["public"]["Enums"]["contract_field_type"]
          help_text: string | null
          id: string
          label: string
          options: Json | null
          required: boolean
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          field_group?: string | null
          field_key: string
          field_type: Database["public"]["Enums"]["contract_field_type"]
          help_text?: string | null
          id?: string
          label: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          field_group?: string | null
          field_key?: string
          field_type?: Database["public"]["Enums"]["contract_field_type"]
          help_text?: string | null
          id?: string
          label?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_md: string
          created_at: string
          created_by: string | null
          default_addendum_template_id: string | null
          default_fields: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body_md: string
          created_at?: string
          created_by?: string | null
          default_addendum_template_id?: string | null
          default_fields?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          created_by?: string | null
          default_addendum_template_id?: string | null
          default_fields?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_default_addendum_template_id_fkey"
            columns: ["default_addendum_template_id"]
            isOneToOne: false
            referencedRelation: "addendum_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_date: string
          contract_number: string | null
          contract_type: string
          created_at: string
          created_by: string | null
          custom_fields: Json
          effective_from: string
          effective_to: string | null
          expiry_reminder_sent_at: string | null
          id: string
          party_a_signer_user_id: string | null
          party_a_snapshot: Json
          party_b_snapshot: Json
          pdf_signed_at: string | null
          pdf_storage_path: string | null
          related_document_ids: string[]
          services_description: string | null
          status: Database["public"]["Enums"]["contract_status"]
          supersedes_contract_id: string | null
          teacher_id: string
          template_fields_snapshot: Json
          template_id: string | null
          termination_reason: string | null
          updated_at: string
          workdrive_file_id: string | null
          workdrive_url: string | null
        }
        Insert: {
          contract_date?: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          effective_from: string
          effective_to?: string | null
          expiry_reminder_sent_at?: string | null
          id?: string
          party_a_signer_user_id?: string | null
          party_a_snapshot?: Json
          party_b_snapshot?: Json
          pdf_signed_at?: string | null
          pdf_storage_path?: string | null
          related_document_ids?: string[]
          services_description?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          supersedes_contract_id?: string | null
          teacher_id: string
          template_fields_snapshot?: Json
          template_id?: string | null
          termination_reason?: string | null
          updated_at?: string
          workdrive_file_id?: string | null
          workdrive_url?: string | null
        }
        Update: {
          contract_date?: string
          contract_number?: string | null
          contract_type?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          effective_from?: string
          effective_to?: string | null
          expiry_reminder_sent_at?: string | null
          id?: string
          party_a_signer_user_id?: string | null
          party_a_snapshot?: Json
          party_b_snapshot?: Json
          pdf_signed_at?: string | null
          pdf_storage_path?: string | null
          related_document_ids?: string[]
          services_description?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          supersedes_contract_id?: string | null
          teacher_id?: string
          template_fields_snapshot?: Json
          template_id?: string | null
          termination_reason?: string | null
          updated_at?: string
          workdrive_file_id?: string | null
          workdrive_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_supersedes_contract_id_fkey"
            columns: ["supersedes_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "contracts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      course_level_links: {
        Row: {
          course_id: string
          created_at: string
          level_id: string
          sort_order: number
        }
        Insert: {
          course_id: string
          created_at?: string
          level_id: string
          sort_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          level_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_level_links_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_level_links_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "course_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      course_levels: {
        Row: {
          cefr: Database["public"]["Enums"]["cefr_level"] | null
          code: string | null
          color_key: string | null
          created_at: string
          id: string
          long_description: string | null
          name: string
          outcomes: string[]
          sort_order: number
          study_plan_template_id: string | null
          target_score: string | null
        }
        Insert: {
          cefr?: Database["public"]["Enums"]["cefr_level"] | null
          code?: string | null
          color_key?: string | null
          created_at?: string
          id?: string
          long_description?: string | null
          name: string
          outcomes?: string[]
          sort_order?: number
          study_plan_template_id?: string | null
          target_score?: string | null
        }
        Update: {
          cefr?: Database["public"]["Enums"]["cefr_level"] | null
          code?: string | null
          color_key?: string | null
          created_at?: string
          id?: string
          long_description?: string | null
          name?: string
          outcomes?: string[]
          sort_order?: number
          study_plan_template_id?: string | null
          target_score?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_levels_study_plan_template_id_fkey"
            columns: ["study_plan_template_id"]
            isOneToOne: false
            referencedRelation: "study_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      course_study_plans: {
        Row: {
          course_id: string
          created_at: string
          is_default: boolean
          sort_order: number
          template_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          is_default?: boolean
          sort_order?: number
          template_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          is_default?: boolean
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_study_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_study_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "study_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cefr_range: string | null
          code: string | null
          color_key: string | null
          created_at: string
          description: string | null
          duration_label: string | null
          hours_per_session: number | null
          icon_key: string | null
          id: string
          image_url: string | null
          long_description: string | null
          max_students: number | null
          name: string
          outcomes: string[]
          price_vnd: number | null
          problem_solving: string | null
          program_id: string
          slug: string | null
          sort_order: number
          status: string
          target_audience: string | null
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          cefr_range?: string | null
          code?: string | null
          color_key?: string | null
          created_at?: string
          description?: string | null
          duration_label?: string | null
          hours_per_session?: number | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          max_students?: number | null
          name: string
          outcomes?: string[]
          price_vnd?: number | null
          problem_solving?: string | null
          program_id: string
          slug?: string | null
          sort_order?: number
          status?: string
          target_audience?: string | null
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          cefr_range?: string | null
          code?: string | null
          color_key?: string | null
          created_at?: string
          description?: string | null
          duration_label?: string | null
          hours_per_session?: number | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          max_students?: number | null
          name?: string
          outcomes?: string[]
          price_vnd?: number | null
          problem_solving?: string | null
          program_id?: string
          slug?: string | null
          sort_order?: number
          status?: string
          target_audience?: string | null
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
      mascot_quotes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          text: string
          tone: Database["public"]["Enums"]["mascot_quote_tone"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text: string
          tone: Database["public"]["Enums"]["mascot_quote_tone"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text?: string
          tone?: Database["public"]["Enums"]["mascot_quote_tone"]
          updated_at?: string
        }
        Relationships: []
      }
      max_quotes: {
        Row: {
          author: string | null
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          language: string
          text: string
          updated_at: string
          weight: number
        }
        Insert: {
          author?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          text: string
          updated_at?: string
          weight?: number
        }
        Update: {
          author?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          text?: string
          updated_at?: string
          weight?: number
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
      payroll_adjustments: {
        Row: {
          amount_vnd: number
          created_at: string
          created_by: string | null
          id: string
          label: string
          notes: string | null
          payslip_id: string
          type: Database["public"]["Enums"]["payroll_adjustment_type"]
          updated_at: string
        }
        Insert: {
          amount_vnd: number
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          notes?: string | null
          payslip_id: string
          type: Database["public"]["Enums"]["payroll_adjustment_type"]
          updated_at?: string
        }
        Update: {
          amount_vnd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          payslip_id?: string
          type?: Database["public"]["Enums"]["payroll_adjustment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payroll_payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_batches: {
        Row: {
          admin_notes: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          month_start: string
          paid_at: string | null
          paid_by: string | null
          status: Database["public"]["Enums"]["payroll_batch_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          month_start: string
          paid_at?: string | null
          paid_by?: string | null
          status?: Database["public"]["Enums"]["payroll_batch_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          month_start?: string
          paid_at?: string | null
          paid_by?: string | null
          status?: Database["public"]["Enums"]["payroll_batch_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payroll_payslip_lines: {
        Row: {
          class_name_snapshot: string | null
          created_at: string
          duration_minutes: number
          entry_date: string
          entry_id: string | null
          id: string
          line_amount_vnd: number
          payslip_id: string
          rate_amount_vnd: number
          rate_unit: Database["public"]["Enums"]["pay_rate_unit"] | null
        }
        Insert: {
          class_name_snapshot?: string | null
          created_at?: string
          duration_minutes?: number
          entry_date: string
          entry_id?: string | null
          id?: string
          line_amount_vnd?: number
          payslip_id: string
          rate_amount_vnd?: number
          rate_unit?: Database["public"]["Enums"]["pay_rate_unit"] | null
        }
        Update: {
          class_name_snapshot?: string | null
          created_at?: string
          duration_minutes?: number
          entry_date?: string
          entry_id?: string | null
          id?: string
          line_amount_vnd?: number
          payslip_id?: string
          rate_amount_vnd?: number
          rate_unit?: Database["public"]["Enums"]["pay_rate_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payslip_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "timesheet_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payslip_lines_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payroll_payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payslips: {
        Row: {
          acknowledged_at: string | null
          adjustments_total_vnd: number
          admin_message: string | null
          batch_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          gross_amount_vnd: number
          id: string
          month_start: string
          net_amount_vnd: number
          paid_at: string | null
          paid_by: string | null
          payment_ref: string | null
          period_id: string
          status: Database["public"]["Enums"]["payroll_payslip_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          adjustments_total_vnd?: number
          admin_message?: string | null
          batch_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gross_amount_vnd?: number
          id?: string
          month_start: string
          net_amount_vnd?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_ref?: string | null
          period_id: string
          status?: Database["public"]["Enums"]["payroll_payslip_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          adjustments_total_vnd?: number
          admin_message?: string | null
          batch_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gross_amount_vnd?: number
          id?: string
          month_start?: string
          net_amount_vnd?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_ref?: string | null
          period_id?: string
          status?: Database["public"]["Enums"]["payroll_payslip_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payslips_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payroll_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payslips_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timesheet_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payslips_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payslips_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "payroll_payslips_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      personal_events: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string | null
          done_at: string | null
          end_time: string | null
          event_date: string
          id: string
          is_done: boolean
          start_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          done_at?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          is_done?: boolean
          start_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          done_at?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          is_done?: boolean
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          admin_code: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          organization: string | null
          phone: string | null
          referral_code: string | null
          referral_source: string | null
          target_ielts: string | null
          updated_at: string
        }
        Insert: {
          admin_code?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id: string
          organization?: string | null
          phone?: string | null
          referral_code?: string | null
          referral_source?: string | null
          target_ielts?: string | null
          updated_at?: string
        }
        Update: {
          admin_code?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
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
      program_levels: {
        Row: {
          created_at: string
          id: string
          level_id: string
          program_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          level_id: string
          program_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          level_id?: string
          program_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_levels_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: true
            referencedRelation: "course_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_levels_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          color_key: string
          created_at: string
          description: string | null
          icon_key: string
          id: string
          is_active: boolean
          key: string
          level: string | null
          name: string
          program_key: string | null
          sort_order: number
          status: string
          syllabus: string | null
          updated_at: string
        }
        Insert: {
          color_key?: string
          created_at?: string
          description?: string | null
          icon_key?: string
          id?: string
          is_active?: boolean
          key: string
          level?: string | null
          name: string
          program_key?: string | null
          sort_order?: number
          status?: string
          syllabus?: string | null
          updated_at?: string
        }
        Update: {
          color_key?: string
          created_at?: string
          description?: string | null
          icon_key?: string
          id?: string
          is_active?: boolean
          key?: string
          level?: string | null
          name?: string
          program_key?: string | null
          sort_order?: number
          status?: string
          syllabus?: string | null
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
      resource_courses: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          resource_id: string
          resource_type: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      rooms: {
        Row: {
          address: string | null
          branch: string | null
          capacity: number
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          meeting_link: string | null
          mode: string
          name: string
          notes: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch?: string | null
          capacity: number
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          meeting_link?: string | null
          mode?: string
          name: string
          notes?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch?: string | null
          capacity?: number
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          meeting_link?: string | null
          mode?: string
          name?: string
          notes?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
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
      session_attendance: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          late_minutes: number | null
          marked_at: string
          marked_by: string | null
          pending_review: boolean
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          self_checked_in_at: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status_enum"]
          student_id: string | null
          student_note: string | null
          teacher_note: string | null
          teachngo_student_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          late_minutes?: number | null
          marked_at?: string
          marked_by?: string | null
          pending_review?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          self_checked_in_at?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status_enum"]
          student_id?: string | null
          student_note?: string | null
          teacher_note?: string | null
          teachngo_student_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          late_minutes?: number | null
          marked_at?: string
          marked_by?: string | null
          pending_review?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          self_checked_in_at?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status_enum"]
          student_id?: string | null
          student_note?: string | null
          teacher_note?: string | null
          teachngo_student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_sessions_pending_lock"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "app_students"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "student_payments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "student_payments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
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
        Relationships: []
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
          cefr_level: string | null
          class_ids: Json | null
          course_id: string | null
          created_at: string
          created_by: string | null
          created_by_user_id: string | null
          current_score: Json
          end_date: string | null
          excluded_dates: Json | null
          exercise_ids: Json | null
          flashcard_set_ids: Json | null
          id: string
          is_public: boolean
          is_template_dirty: boolean
          is_user_owned: boolean
          materials_links: Json | null
          parent_template_id: string | null
          parent_uop_id: string | null
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
          tags: string[] | null
          target_score: Json
          teacher_notes: string | null
          teachngo_student_id: string | null
          test_date: string | null
          total_hours: number | null
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          assigned_level?: string | null
          cefr_level?: string | null
          class_ids?: Json | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          current_score?: Json
          end_date?: string | null
          excluded_dates?: Json | null
          exercise_ids?: Json | null
          flashcard_set_ids?: Json | null
          id?: string
          is_public?: boolean
          is_template_dirty?: boolean
          is_user_owned?: boolean
          materials_links?: Json | null
          parent_template_id?: string | null
          parent_uop_id?: string | null
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
          tags?: string[] | null
          target_score?: Json
          teacher_notes?: string | null
          teachngo_student_id?: string | null
          test_date?: string | null
          total_hours?: number | null
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          assigned_level?: string | null
          cefr_level?: string | null
          class_ids?: Json | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          current_score?: Json
          end_date?: string | null
          excluded_dates?: Json | null
          exercise_ids?: Json | null
          flashcard_set_ids?: Json | null
          id?: string
          is_public?: boolean
          is_template_dirty?: boolean
          is_user_owned?: boolean
          materials_links?: Json | null
          parent_template_id?: string | null
          parent_uop_id?: string | null
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
          tags?: string[] | null
          target_score?: Json
          teacher_notes?: string | null
          teachngo_student_id?: string | null
          test_date?: string | null
          total_hours?: number | null
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plans_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "study_plan_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plans_parent_uop_id_fkey"
            columns: ["parent_uop_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
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
      synced_students: {
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
      teacher_availability_drafts: {
        Row: {
          availability_exceptions: Json
          availability_rules: Json
          created_at: string
          desired_programs: string[]
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          superseded_at: string | null
          superseded_by: string | null
          teacher_id: string
          updated_at: string
          validation_summary: Json | null
        }
        Insert: {
          availability_exceptions?: Json
          availability_rules?: Json
          created_at?: string
          desired_programs?: string[]
          effective_from: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          superseded_at?: string | null
          superseded_by?: string | null
          teacher_id: string
          updated_at?: string
          validation_summary?: Json | null
        }
        Update: {
          availability_exceptions?: Json
          availability_rules?: Json
          created_at?: string
          desired_programs?: string[]
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          superseded_at?: string | null
          superseded_by?: string | null
          teacher_id?: string
          updated_at?: string
          validation_summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_drafts_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "teacher_availability_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_availability_drafts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_availability_drafts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_availability_drafts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_availability_exceptions: {
        Row: {
          action: string
          created_at: string
          end_time: string
          exception_date: string
          id: string
          mode: string | null
          note: string | null
          start_time: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          end_time: string
          exception_date: string
          id?: string
          mode?: string | null
          note?: string | null
          start_time: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          end_time?: string
          exception_date?: string
          id?: string
          mode?: string | null
          note?: string | null
          start_time?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_exceptions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_availability_exceptions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_availability_exceptions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_availability_rules: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          end_time: string
          id: string
          mode: string | null
          note: string | null
          start_time: string
          teacher_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          end_time: string
          id?: string
          mode?: string | null
          note?: string | null
          start_time: string
          teacher_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          end_time?: string
          id?: string
          mode?: string | null
          note?: string | null
          start_time?: string
          teacher_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_rules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_availability_rules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_availability_rules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_capabilities: {
        Row: {
          can_teach_offline: boolean | null
          can_teach_online: boolean | null
          created_at: string
          eligible_program_keys: string[] | null
          id: string
          level_keys: string[] | null
          max_hours_per_week: number | null
          notes: string | null
          program_keys: string[] | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          can_teach_offline?: boolean | null
          can_teach_online?: boolean | null
          created_at?: string
          eligible_program_keys?: string[] | null
          id?: string
          level_keys?: string[] | null
          max_hours_per_week?: number | null
          notes?: string | null
          program_keys?: string[] | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          can_teach_offline?: boolean | null
          can_teach_online?: boolean | null
          created_at?: string
          eligible_program_keys?: string[] | null
          id?: string
          level_keys?: string[] | null
          max_hours_per_week?: number | null
          notes?: string | null
          program_keys?: string[] | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_capabilities_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_capabilities_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_capabilities_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_capability_drafts: {
        Row: {
          can_teach_offline: boolean
          can_teach_online: boolean
          created_at: string
          id: string
          level_keys: string[]
          max_hours_per_week: number | null
          notes: string | null
          program_keys: string[]
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          can_teach_offline?: boolean
          can_teach_online?: boolean
          created_at?: string
          id?: string
          level_keys?: string[]
          max_hours_per_week?: number | null
          notes?: string | null
          program_keys?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          can_teach_offline?: boolean
          can_teach_online?: boolean
          created_at?: string
          id?: string
          level_keys?: string[]
          max_hours_per_week?: number | null
          notes?: string | null
          program_keys?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_capability_drafts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_capability_drafts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_capability_drafts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_certifications: {
        Row: {
          attachment_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          kind: string
          name: string
          notes: string | null
          score: number | null
          score_detail: Json | null
          teacher_id: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          kind: string
          name: string
          notes?: string | null
          score?: number | null
          score_detail?: Json | null
          teacher_id: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          kind?: string
          name?: string
          notes?: string | null
          score?: number | null
          score_detail?: Json | null
          teacher_id?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_certifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_certifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_certifications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
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
      teacher_targets: {
        Row: {
          created_at: string
          effective_from: string | null
          note: string | null
          target_active_classes: number | null
          target_avg_revenue_6mo: number | null
          target_max_late_count: number | null
          target_on_time_pct: number | null
          teacher_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          note?: string | null
          target_active_classes?: number | null
          target_avg_revenue_6mo?: number | null
          target_max_late_count?: number | null
          target_on_time_pct?: number | null
          teacher_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          note?: string | null
          target_active_classes?: number | null
          target_avg_revenue_6mo?: number | null
          target_max_late_count?: number | null
          target_on_time_pct?: number | null
          teacher_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_targets_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_targets_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_targets_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_tax_declarations: {
        Row: {
          admin_note: string | null
          attachments_url: string | null
          contract_type: Database["public"]["Enums"]["tax_contract_type"]
          created_at: string
          dependents_count: number
          gross_amount: number
          id: string
          insurance_deductions: number
          net_amount: number
          other_income: number
          period_kind: Database["public"]["Enums"]["tax_period_kind"]
          period_month: number | null
          period_quarter: number | null
          period_year: number
          quantity: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["tax_declaration_status"]
          submitted_at: string | null
          tax_amount: number
          taxable_income: number
          teacher_id: string
          teacher_note: string | null
          unit: Database["public"]["Enums"]["tax_unit"]
          unit_rate: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          attachments_url?: string | null
          contract_type?: Database["public"]["Enums"]["tax_contract_type"]
          created_at?: string
          dependents_count?: number
          gross_amount?: number
          id?: string
          insurance_deductions?: number
          net_amount?: number
          other_income?: number
          period_kind?: Database["public"]["Enums"]["tax_period_kind"]
          period_month?: number | null
          period_quarter?: number | null
          period_year: number
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["tax_declaration_status"]
          submitted_at?: string | null
          tax_amount?: number
          taxable_income?: number
          teacher_id: string
          teacher_note?: string | null
          unit?: Database["public"]["Enums"]["tax_unit"]
          unit_rate?: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          attachments_url?: string | null
          contract_type?: Database["public"]["Enums"]["tax_contract_type"]
          created_at?: string
          dependents_count?: number
          gross_amount?: number
          id?: string
          insurance_deductions?: number
          net_amount?: number
          other_income?: number
          period_kind?: Database["public"]["Enums"]["tax_period_kind"]
          period_month?: number | null
          period_quarter?: number | null
          period_year?: number
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["tax_declaration_status"]
          submitted_at?: string | null
          tax_amount?: number
          taxable_income?: number
          teacher_id?: string
          teacher_note?: string | null
          unit?: Database["public"]["Enums"]["tax_unit"]
          unit_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_tax_declarations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_tax_declarations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "teacher_tax_declarations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teachers: {
        Row: {
          avatar_url: string | null
          bank_account_holder: string | null
          bank_account_last_confirmed_at: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bio_long: string | null
          bio_short: string | null
          can_use_ai_grading: boolean | null
          cccd_issue_date: string | null
          cccd_issue_place: string | null
          cccd_number: string | null
          classes: string | null
          created_at: string
          current_address: string | null
          date_of_birth: string | null
          dob: string | null
          email: string | null
          employment_status: string | null
          full_name: string
          gender: string | null
          hired_at: string | null
          id: string
          internal_employee_id: string | null
          linked_user_id: string | null
          national_id: string | null
          national_id_issued_at: string | null
          national_id_issued_by: string | null
          notes: string | null
          notification_email_opt_in: boolean
          notification_zalo: string | null
          permanent_address: string | null
          phone: string | null
          raw_data: Json | null
          signature_image_url: string | null
          signature_url: string | null
          status: string
          subjects: string | null
          tax_code: string | null
          teachngo_staff_id: string | null
          terminated_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bank_account_holder?: string | null
          bank_account_last_confirmed_at?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bio_long?: string | null
          bio_short?: string | null
          can_use_ai_grading?: boolean | null
          cccd_issue_date?: string | null
          cccd_issue_place?: string | null
          cccd_number?: string | null
          classes?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          dob?: string | null
          email?: string | null
          employment_status?: string | null
          full_name: string
          gender?: string | null
          hired_at?: string | null
          id?: string
          internal_employee_id?: string | null
          linked_user_id?: string | null
          national_id?: string | null
          national_id_issued_at?: string | null
          national_id_issued_by?: string | null
          notes?: string | null
          notification_email_opt_in?: boolean
          notification_zalo?: string | null
          permanent_address?: string | null
          phone?: string | null
          raw_data?: Json | null
          signature_image_url?: string | null
          signature_url?: string | null
          status?: string
          subjects?: string | null
          tax_code?: string | null
          teachngo_staff_id?: string | null
          terminated_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bank_account_holder?: string | null
          bank_account_last_confirmed_at?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bio_long?: string | null
          bio_short?: string | null
          can_use_ai_grading?: boolean | null
          cccd_issue_date?: string | null
          cccd_issue_place?: string | null
          cccd_number?: string | null
          classes?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          dob?: string | null
          email?: string | null
          employment_status?: string | null
          full_name?: string
          gender?: string | null
          hired_at?: string | null
          id?: string
          internal_employee_id?: string | null
          linked_user_id?: string | null
          national_id?: string | null
          national_id_issued_at?: string | null
          national_id_issued_by?: string | null
          notes?: string | null
          notification_email_opt_in?: boolean
          notification_zalo?: string | null
          permanent_address?: string | null
          phone?: string | null
          raw_data?: Json | null
          signature_image_url?: string | null
          signature_url?: string | null
          status?: string
          subjects?: string | null
          tax_code?: string | null
          teachngo_staff_id?: string | null
          terminated_at?: string | null
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
      timesheet_entries: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          class_id: string | null
          class_name_snapshot: string | null
          class_session_id: string | null
          confirmed_at: string | null
          created_at: string
          duration_minutes: number | null
          entry_date: string
          id: string
          notes: string | null
          period_id: string
          planned_end: string
          planned_start: string
          reason: string | null
          snapshot_addendum_id: string | null
          snapshot_rate_amount_vnd: number | null
          snapshot_rate_unit:
            | Database["public"]["Enums"]["pay_rate_unit"]
            | null
          status: Database["public"]["Enums"]["timesheet_entry_status"]
          substitute_teacher_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          class_id?: string | null
          class_name_snapshot?: string | null
          class_session_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          entry_date: string
          id?: string
          notes?: string | null
          period_id: string
          planned_end: string
          planned_start: string
          reason?: string | null
          snapshot_addendum_id?: string | null
          snapshot_rate_amount_vnd?: number | null
          snapshot_rate_unit?:
            | Database["public"]["Enums"]["pay_rate_unit"]
            | null
          status?: Database["public"]["Enums"]["timesheet_entry_status"]
          substitute_teacher_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          class_id?: string | null
          class_name_snapshot?: string | null
          class_session_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          entry_date?: string
          id?: string
          notes?: string | null
          period_id?: string
          planned_end?: string
          planned_start?: string
          reason?: string | null
          snapshot_addendum_id?: string | null
          snapshot_rate_amount_vnd?: number | null
          snapshot_rate_unit?:
            | Database["public"]["Enums"]["pay_rate_unit"]
            | null
          status?: Database["public"]["Enums"]["timesheet_entry_status"]
          substitute_teacher_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "timesheet_entries_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "timesheet_entries_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "v_sessions_pending_lock"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "timesheet_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timesheet_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_snapshot_addendum_id_fkey"
            columns: ["snapshot_addendum_id"]
            isOneToOne: false
            referencedRelation: "contract_addendums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "timesheet_entries_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "timesheet_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "timesheet_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      timesheet_periods: {
        Row: {
          admin_message: string | null
          approved_at: string | null
          created_at: string
          id: string
          locked_at: string | null
          month_start: string
          status: Database["public"]["Enums"]["timesheet_period_status"]
          submitted_at: string | null
          teacher_id: string
          total_minutes: number
          total_taught_count: number
          updated_at: string
        }
        Insert: {
          admin_message?: string | null
          approved_at?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          month_start: string
          status?: Database["public"]["Enums"]["timesheet_period_status"]
          submitted_at?: string | null
          teacher_id: string
          total_minutes?: number
          total_taught_count?: number
          updated_at?: string
        }
        Update: {
          admin_message?: string | null
          approved_at?: string | null
          created_at?: string
          id?: string
          locked_at?: string | null
          month_start?: string
          status?: Database["public"]["Enums"]["timesheet_period_status"]
          submitted_at?: string | null
          teacher_id?: string
          total_minutes?: number
          total_taught_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_periods_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_periods_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "timesheet_periods_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
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
      vocab_challenges: {
        Row: {
          challenger_id: string
          challenger_score: number
          challenger_seen_result: boolean
          created_at: string
          days: number
          ends_at: string | null
          id: string
          message: string
          opponent_id: string
          opponent_score: number
          opponent_seen_result: boolean
          started_at: string | null
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          challenger_score?: number
          challenger_seen_result?: boolean
          created_at?: string
          days?: number
          ends_at?: string | null
          id?: string
          message?: string
          opponent_id: string
          opponent_score?: number
          opponent_seen_result?: boolean
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          challenger_score?: number
          challenger_seen_result?: boolean
          created_at?: string
          days?: number
          ends_at?: string | null
          id?: string
          message?: string
          opponent_id?: string
          opponent_score?: number
          opponent_seen_result?: boolean
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
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
        Relationships: []
      }
      classes: {
        Row: {
          branch: string | null
          cancellation_reason: string | null
          class_code: string | null
          class_name: string | null
          class_type: string | null
          course_id: string | null
          course_title: string | null
          created_at: string | null
          data_source: string | null
          default_end_time: string | null
          default_start_time: string | null
          description: string | null
          end_date: string | null
          id: string | null
          leaderboard_enabled: boolean | null
          level: string | null
          lifecycle_status:
            | Database["public"]["Enums"]["class_lifecycle_status"]
            | null
          max_students: number | null
          mode: string | null
          name: string | null
          notes: string | null
          price_vnd_override: number | null
          program: string | null
          room: string | null
          room_id: string | null
          schedule: string | null
          start_date: string | null
          status: string | null
          status_changed_at: string | null
          student_count: number | null
          study_plan_id: string | null
          teacher_id: string | null
          teacher_name: string | null
          updated_at: string | null
        }
        Insert: {
          branch?: string | null
          cancellation_reason?: string | null
          class_code?: string | null
          class_name?: string | null
          class_type?: string | null
          course_id?: string | null
          course_title?: string | null
          created_at?: string | null
          data_source?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          leaderboard_enabled?: boolean | null
          level?: string | null
          lifecycle_status?:
            | Database["public"]["Enums"]["class_lifecycle_status"]
            | null
          max_students?: number | null
          mode?: string | null
          name?: never
          notes?: string | null
          price_vnd_override?: number | null
          program?: string | null
          room?: string | null
          room_id?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          status_changed_at?: string | null
          student_count?: number | null
          study_plan_id?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string | null
        }
        Update: {
          branch?: string | null
          cancellation_reason?: string | null
          class_code?: string | null
          class_name?: string | null
          class_type?: string | null
          course_id?: string | null
          course_title?: string | null
          created_at?: string | null
          data_source?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          leaderboard_enabled?: boolean | null
          level?: string | null
          lifecycle_status?:
            | Database["public"]["Enums"]["class_lifecycle_status"]
            | null
          max_students?: number | null
          mode?: string | null
          name?: never
          notes?: string | null
          price_vnd_override?: number | null
          program?: string | null
          room?: string | null
          room_id?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          status_changed_at?: string | null
          student_count?: number | null
          study_plan_id?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
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
      v_class_attendance_health: {
        Row: {
          class_code: string | null
          class_id: string | null
          class_name: string | null
          late_lock_count: number | null
          locked_sessions: number | null
          overdue_count: number | null
          pending_count: number | null
          teacher_id: string | null
          total_sessions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      v_class_full: {
        Row: {
          active_student_count: number | null
          branch: string | null
          cancellation_reason: string | null
          class_code: string | null
          class_type: string | null
          course_color_key: string | null
          course_icon_key: string | null
          course_id: string | null
          course_name: string | null
          course_price_vnd: number | null
          course_slug: string | null
          created_at: string | null
          data_source: string | null
          default_end_time: string | null
          default_start_time: string | null
          description: string | null
          effective_price_vnd: number | null
          end_date: string | null
          id: string | null
          leaderboard_enabled: boolean | null
          level: string | null
          lifecycle_status:
            | Database["public"]["Enums"]["class_lifecycle_status"]
            | null
          max_students: number | null
          mode: string | null
          name: string | null
          pending_invitations: number | null
          price_vnd_override: number | null
          program: string | null
          room: string | null
          room_id: string | null
          schedule: string | null
          sessions_completed: number | null
          sessions_total: number | null
          sessions_upcoming: number | null
          start_date: string | null
          status_changed_at: string | null
          study_plan_id: string | null
          study_plan_name: string | null
          study_plan_total_sessions: number | null
          teacher_avatar_url: string | null
          teacher_email: string | null
          teacher_full_name: string | null
          teacher_id: string | null
          teacher_name_legacy: string | null
          total_student_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      v_class_invitation_active_rates: {
        Row: {
          class_id: string | null
          rate_amount_vnd: number | null
          rate_unit: string | null
          responded_at: string | null
          teacher_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "app_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_invitations_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
        ]
      }
      v_class_revenue: {
        Row: {
          active_student_count: number | null
          class_id: string | null
          collected_revenue_vnd: number | null
          effective_price_vnd: number | null
          expected_revenue_vnd: number | null
          last_payment_date: string | null
          outstanding_revenue_vnd: number | null
          paid_transaction_count: number | null
        }
        Relationships: []
      }
      v_class_teacher_payroll: {
        Row: {
          class_id: string | null
          last_taught_date: string | null
          session_count: number | null
          taught_count: number | null
          teacher_id: string | null
          total_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      v_sessions_pending_lock: {
        Row: {
          class_code: string | null
          class_id: string | null
          class_name: string | null
          end_time: string | null
          expected_count: number | null
          hours_since_start: number | null
          is_late_locked: boolean | null
          lock_status: string | null
          marked_count: number | null
          session_date: string | null
          session_id: string | null
          session_number: number | null
          session_ts: string | null
          start_time: string | null
          status: string | null
          teacher_id: string | null
          teacher_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "app_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_attendance_health"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_app_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_class_revenue"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      v_teacher_kpi_snapshot: {
        Row: {
          active_classes_count: number | null
          avg_gross_vnd_6mo: number | null
          full_name: string | null
          late_count_month: number | null
          late_count_year: number | null
          locked_on_time_month: number | null
          locked_on_time_year: number | null
          locked_total_month: number | null
          locked_total_year: number | null
          on_time_pct_month: number | null
          on_time_pct_year: number | null
          target_active_classes: number | null
          target_avg_revenue_6mo: number | null
          target_max_late_count: number | null
          target_on_time_pct: number | null
          teacher_id: string | null
        }
        Relationships: []
      }
      v_teacher_performance: {
        Row: {
          active_classes_count: number | null
          avg_gross_vnd_6mo: number | null
          full_name: string | null
          late_count_month: number | null
          late_count_year: number | null
          locked_on_time_month: number | null
          locked_on_time_year: number | null
          locked_total_month: number | null
          locked_total_year: number | null
          on_time_pct_month: number | null
          on_time_pct_year: number | null
          target_active_classes: number | null
          target_avg_revenue_6mo: number | null
          target_max_late_count: number | null
          target_on_time_pct: number | null
          teacher_id: string | null
        }
        Relationships: []
      }
      v_teacher_performance_monthly: {
        Row: {
          late_count: number | null
          locked_on_time: number | null
          locked_total: number | null
          on_time_pct: number | null
          period_month: string | null
          teacher_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_kpi_snapshot"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "class_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_performance"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
    }
    Functions: {
      _addendum_assert_admin: { Args: never; Returns: undefined }
      _addendum_load: {
        Args: { p_addendum_id: string }
        Returns: Record<string, unknown>
      }
      _admin_session_assert_period_unlocked: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      _build_party_a_snapshot: {
        Args: { p_signer_user_id?: string }
        Returns: Json
      }
      _build_party_b_snapshot: { Args: { p_teacher_id: string }; Returns: Json }
      _log_addendum_event: {
        Args: {
          p_action: string
          p_addendum_id: string
          p_from_status?: Database["public"]["Enums"]["addendum_status"]
          p_notes?: string
          p_payload?: Json
          p_to_status?: Database["public"]["Enums"]["addendum_status"]
        }
        Returns: undefined
      }
      _log_contract_event: {
        Args: {
          p_contract_id: string
          p_diff?: Json
          p_event_type: string
          p_message?: string
        }
        Returns: undefined
      }
      _reserved_addendum_field_keys: { Args: never; Returns: string[] }
      _reserved_contract_field_keys: { Args: never; Returns: string[] }
      _validate_addendum_template_field_key: {
        Args: { p_key: string }
        Returns: undefined
      }
      _validate_template_field_key: {
        Args: { p_key: string }
        Returns: undefined
      }
      addendum_admin_sign: {
        Args: {
          p_addendum_id: string
          p_ip_address?: unknown
          p_signature_image_url: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      addendum_create: {
        Args: {
          p_addendum_number?: string
          p_auto_archive_on_activate?: boolean
          p_contract_id: string
          p_custom_fields?: Json
          p_effective_from: string
          p_effective_to?: string
          p_notes?: string
          p_party_a_signer_user_id?: string
          p_pay_rates?: Json
          p_template_id?: string
        }
        Returns: string
      }
      addendum_get: { Args: { p_addendum_id: string }; Returns: Json }
      addendum_list: {
        Args: {
          p_active_only?: boolean
          p_contract_id?: string
          p_status?: Database["public"]["Enums"]["addendum_status"]
        }
        Returns: Json
      }
      addendum_pay_rate_delete: { Args: { p_id: string }; Returns: undefined }
      addendum_pay_rate_upsert: {
        Args: {
          p_addendum_id: string
          p_id?: string
          p_max_threshold?: number
          p_min_threshold?: number
          p_notes?: string
          p_program_id?: string
          p_rate_amount_vnd: number
          p_rate_unit: Database["public"]["Enums"]["pay_rate_unit"]
          p_sort_order?: number
        }
        Returns: string
      }
      addendum_request_revision: {
        Args: { p_addendum_id: string; p_message?: string }
        Returns: undefined
      }
      addendum_send_to_teacher: {
        Args: { p_addendum_id: string; p_message?: string }
        Returns: undefined
      }
      addendum_set_pdf_path: {
        Args: { p_addendum_id: string; p_pdf_storage_path: string }
        Returns: undefined
      }
      addendum_teacher_sign: {
        Args: {
          p_addendum_id: string
          p_ip_address?: unknown
          p_signature_image_url: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      addendum_template_archive: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      addendum_template_create: {
        Args: {
          p_body_md?: string
          p_default_auto_archive?: boolean
          p_description?: string
          p_name: string
        }
        Returns: string
      }
      addendum_template_field_delete: {
        Args: { p_field_id: string }
        Returns: undefined
      }
      addendum_template_field_reorder: {
        Args: { p_ordered_ids: string[]; p_template_id: string }
        Returns: undefined
      }
      addendum_template_field_upsert: {
        Args: {
          p_default_value?: Json
          p_field_group?: string
          p_field_key: string
          p_field_type: Database["public"]["Enums"]["contract_field_type"]
          p_help_text?: string
          p_id?: string
          p_label: string
          p_options?: Json
          p_required?: boolean
          p_sort_order?: number
          p_template_id: string
        }
        Returns: string
      }
      addendum_template_get_with_fields: {
        Args: { p_template_id: string }
        Returns: Json
      }
      addendum_template_update: {
        Args: {
          p_body_md?: string
          p_default_auto_archive?: boolean
          p_description?: string
          p_is_active?: boolean
          p_name?: string
          p_template_id: string
        }
        Returns: undefined
      }
      addendum_templates_list: {
        Args: { p_include_archived?: boolean }
        Returns: Json
      }
      addendum_terminate: {
        Args: { p_addendum_id: string; p_reason?: string }
        Returns: undefined
      }
      addendum_update_custom_fields: {
        Args: { p_addendum_id: string; p_custom_fields: Json }
        Returns: undefined
      }
      addendum_update_meta: {
        Args: {
          p_addendum_id: string
          p_auto_archive_on_activate?: boolean
          p_effective_from?: string
          p_effective_to?: string
          p_notes?: string
          p_party_a_signer_user_id?: string
        }
        Returns: undefined
      }
      admin_archive_room: {
        Args: { p_force?: boolean; p_room_id: string }
        Returns: Json
      }
      admin_assign_room_to_session: {
        Args: { p_force?: boolean; p_room_id: string; p_session_id: string }
        Returns: Json
      }
      admin_cancel_session: {
        Args: { p_reason: string; p_session_id: string }
        Returns: undefined
      }
      admin_check_room_conflict: {
        Args: {
          p_end_time: string
          p_exclude_session_id?: string
          p_room_id: string
          p_session_date: string
          p_start_time: string
        }
        Returns: Json
      }
      admin_check_teacher_conflict: {
        Args: {
          p_end_time: string
          p_exclude_session_id?: string
          p_session_date: string
          p_start_time: string
          p_teacher_id: string
        }
        Returns: Json
      }
      admin_create_room: { Args: { p_room_data: Json }; Returns: string }
      admin_force_unlock_session: {
        Args: { _reason: string; _session_id: string }
        Returns: Json
      }
      admin_mark_session_substituted: {
        Args: {
          p_note: string
          p_session_id: string
          p_substitute_teacher_id: string
        }
        Returns: undefined
      }
      admin_review_capability_draft: {
        Args: { p_action: string; p_draft_id: string; p_note?: string }
        Returns: Json
      }
      admin_update_room: {
        Args: { p_room_data: Json; p_room_id: string }
        Returns: undefined
      }
      admin_update_session_info: {
        Args: {
          p_end_time: string
          p_mode: string
          p_notes: string
          p_room: string
          p_session_date: string
          p_session_id: string
          p_start_time: string
        }
        Returns: undefined
      }
      admin_update_session_teacher: {
        Args: {
          p_new_teacher_id: string
          p_reason: string
          p_session_id: string
        }
        Returns: undefined
      }
      admin_upsert_teacher_target: {
        Args: {
          _effective_from?: string
          _kpi_key: string
          _note?: string
          _target_value: number
          _teacher_id: string
        }
        Returns: undefined
      }
      app_settings_party_a_update: {
        Args: { p_value: Json }
        Returns: undefined
      }
      approve_and_apply_availability: {
        Args: { p_draft_id: string; p_review_note?: string }
        Returns: Json
      }
      archive_class: {
        Args: { p_archive?: boolean; p_class_id: string }
        Returns: undefined
      }
      auto_assign_class_levels: { Args: never; Returns: Json }
      auto_expire_contracts: { Args: never; Returns: number }
      auto_link_class_teachers: { Args: never; Returns: Json }
      auto_link_teachers: { Args: never; Returns: Json }
      auto_link_teachngo_students: { Args: never; Returns: Json }
      batch_resend_class_invitations: {
        Args: { p_class_id: string; p_invitation_ids?: string[] }
        Returns: Json
      }
      build_class_code: {
        Args: {
          _level: string
          _program: string
          _room_id: string
          _start_date: string
        }
        Returns: string
      }
      calc_pit_progressive: { Args: { taxable: number }; Returns: number }
      can_grade_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      cancel_class_invitation: {
        Args: { p_invitation_id: string; p_note?: string }
        Returns: Json
      }
      check_availability_expiry: {
        Args: { p_teacher_id?: string }
        Returns: Json
      }
      class_invitations_expire_tick: { Args: never; Returns: Json }
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
      confirm_my_bank_account_for_payroll: { Args: never; Returns: Json }
      contract_admin_sign: {
        Args: {
          p_contract_id: string
          p_ip_address?: unknown
          p_signature_image_url: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      contract_create: {
        Args: {
          p_contract_number?: string
          p_contract_type?: string
          p_custom_fields?: Json
          p_effective_from: string
          p_effective_to: string
          p_party_a_signer_user_id?: string
          p_related_document_ids?: string[]
          p_services_description?: string
          p_supersedes_contract_id?: string
          p_teacher_id: string
          p_template_id: string
        }
        Returns: string
      }
      contract_get_with_details: {
        Args: { p_contract_id: string }
        Returns: Json
      }
      contract_list: {
        Args: {
          p_expiring_within_days?: number
          p_status?: Database["public"]["Enums"]["contract_status"]
          p_teacher_id?: string
        }
        Returns: Json
      }
      contract_mark_expiry_reminded: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      contract_pay_rate_archive: {
        Args: { p_rate_id: string }
        Returns: undefined
      }
      contract_pay_rate_create: {
        Args: {
          p_contract_id: string
          p_effective_from?: string
          p_effective_to?: string
          p_max_threshold?: number
          p_min_threshold?: number
          p_notes?: string
          p_program_id: string
          p_rate_amount_vnd: number
          p_rate_unit: Database["public"]["Enums"]["pay_rate_unit"]
        }
        Returns: string
      }
      contract_request_resign: {
        Args: { p_contract_id: string; p_message?: string }
        Returns: undefined
      }
      contract_request_revision: {
        Args: { p_contract_id: string; p_message: string }
        Returns: undefined
      }
      contract_send_to_teacher: {
        Args: { p_contract_id: string; p_message?: string }
        Returns: undefined
      }
      contract_set_pdf_path: {
        Args: { p_contract_id: string; p_pdf_storage_path: string }
        Returns: undefined
      }
      contract_teacher_sign: {
        Args: {
          p_contract_id: string
          p_ip_address?: unknown
          p_signature_image_url: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      contract_teacher_update_party_b: {
        Args: {
          p_contract_id: string
          p_party_b_snapshot: Json
          p_persist_to_profile?: boolean
        }
        Returns: undefined
      }
      contract_template_archive: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      contract_template_create: {
        Args: { p_body_md?: string; p_description?: string; p_name: string }
        Returns: string
      }
      contract_template_field_delete: {
        Args: { p_field_id: string }
        Returns: undefined
      }
      contract_template_field_reorder: {
        Args: { p_ordered_ids: string[]; p_template_id: string }
        Returns: undefined
      }
      contract_template_field_upsert: {
        Args: {
          p_default_value?: Json
          p_field_group?: string
          p_field_key: string
          p_field_type: Database["public"]["Enums"]["contract_field_type"]
          p_help_text?: string
          p_id?: string
          p_label: string
          p_options?: Json
          p_required?: boolean
          p_sort_order?: number
          p_template_id: string
        }
        Returns: string
      }
      contract_template_get_with_fields: {
        Args: { p_template_id: string }
        Returns: Json
      }
      contract_template_set_default_addendum: {
        Args: { p_addendum_template_id: string; p_contract_template_id: string }
        Returns: undefined
      }
      contract_template_update: {
        Args: {
          p_body_md?: string
          p_description?: string
          p_is_active?: boolean
          p_name?: string
          p_template_id: string
        }
        Returns: undefined
      }
      contract_templates_list: {
        Args: { p_include_archived?: boolean }
        Returns: Json
      }
      contract_terminate: {
        Args: { p_contract_id: string; p_reason: string }
        Returns: undefined
      }
      contract_update_custom_fields: {
        Args: { p_contract_id: string; p_custom_fields: Json }
        Returns: undefined
      }
      contracts_tick_daily: { Args: never; Returns: Json }
      create_class_atomic: {
        Args: {
          p_class_data: Json
          p_primary_teacher_ids?: string[]
          p_sessions?: Json
          p_ta_teacher_ids?: string[]
        }
        Returns: Json
      }
      create_class_with_template_atomic: {
        Args: {
          p_class_data: Json
          p_end_date: string
          p_primary_teacher_ids?: string[]
          p_schedule_pattern: Json
          p_sessions?: Json
          p_start_date: string
          p_ta_teacher_ids?: string[]
          p_template_id: string
        }
        Returns: string
      }
      current_teacher_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_user_cascade: { Args: { p_user_id: string }; Returns: Json }
      derive_course_abbr: { Args: { _name: string }; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      finalize_expired_challenges: { Args: never; Returns: number }
      find_available_teachers_for_slot: {
        Args: {
          p_end_time: string
          p_mode?: string
          p_program_key?: string
          p_session_date?: string
          p_start_time: string
          p_weekday: number
        }
        Returns: Json
      }
      find_available_teachers_for_slot_v2: {
        Args: {
          p_end_time: string
          p_level_key?: string
          p_mode?: string
          p_program_key?: string
          p_session_date?: string
          p_start_time: string
          p_weekday: number
        }
        Returns: Json
      }
      find_lowest_revenue_teachers: {
        Args: { p_limit?: number; p_program_key?: string }
        Returns: Json
      }
      find_opponents: {
        Args: { _query: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          organization: string
        }[]
      }
      generate_addendum_number: { Args: { p_date?: string }; Returns: string }
      generate_class_code: { Args: { p_class_id: string }; Returns: string }
      generate_contract_number: {
        Args: { p_contract_date?: string }
        Returns: string
      }
      get_challenge_live_score: {
        Args: { _challenge_id: string }
        Returns: {
          challenger_score: number
          opponent_score: number
        }[]
      }
      get_class_overview: { Args: { p_class_id: string }; Returns: Json }
      get_class_status_history: {
        Args: { p_class_id: string }
        Returns: {
          changed_by: string
          changed_by_name: string
          changed_by_role: string
          created_at: string
          from_status: Database["public"]["Enums"]["class_lifecycle_status"]
          id: string
          reason: string
          to_status: Database["public"]["Enums"]["class_lifecycle_status"]
        }[]
      }
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
      get_teacher_available_slots: {
        Args: {
          p_from_date?: string
          p_program_key?: string
          p_teacher_id: string
          p_to_date?: string
        }
        Returns: Json
      }
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
      inherit_class_from_course: {
        Args: { p_class_id: string; p_course_id: string; p_overwrite?: boolean }
        Returns: {
          allow_self_checkin: boolean
          branch: string | null
          cancellation_reason: string | null
          class_code: string | null
          class_name: string
          class_type: string | null
          course_id: string | null
          course_title: string | null
          created_at: string
          data_source: string | null
          default_end_time: string | null
          default_mode: string | null
          default_start_time: string | null
          description: string | null
          end_date: string | null
          id: string
          leaderboard_enabled: boolean
          level: string | null
          lifecycle_status: Database["public"]["Enums"]["class_lifecycle_status"]
          max_students: number | null
          mode: string | null
          name: string | null
          notes: string | null
          price_vnd_override: number | null
          program: string | null
          room: string | null
          room_id: string | null
          schedule: string | null
          start_date: string | null
          status: string
          status_changed_at: string | null
          student_count: number | null
          study_plan_id: string | null
          teacher_id: string | null
          teacher_name: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "app_classes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
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
      is_owner_teacher: { Args: { _teacher_id: string }; Returns: boolean }
      is_student_in_class: { Args: { _class_id: string }; Returns: boolean }
      is_student_of_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      is_teacher_of_class: { Args: { _class_id: string }; Returns: boolean }
      lock_session_attendance: { Args: { _session_id: string }; Returns: Json }
      lookup_level_code: { Args: { _level: string }; Returns: string }
      lookup_program_2: { Args: { _program: string }; Returns: string }
      lookup_program_code: { Args: { _program: string }; Returns: string }
      mark_overdue_sessions_late: { Args: never; Returns: Json }
      mark_session_attendance: {
        Args: { _entries: Json; _session_id: string }
        Returns: Json
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
      next_entity_code: {
        Args: {
          p_column: string
          p_pad?: number
          p_prefix: string
          p_table: string
        }
        Returns: string
      }
      payroll_adjustment_delete: { Args: { p_id: string }; Returns: undefined }
      payroll_adjustment_upsert: {
        Args: {
          p_amount_vnd: number
          p_id: string
          p_label: string
          p_notes?: string
          p_payslip_id: string
          p_type: Database["public"]["Enums"]["payroll_adjustment_type"]
        }
        Returns: string
      }
      payroll_batch_confirm: { Args: { p_id: string }; Returns: number }
      payroll_batch_create_for_month: {
        Args: { p_month_start: string }
        Returns: string
      }
      payroll_batch_get: { Args: { p_id: string }; Returns: Json }
      payroll_batch_list: {
        Args: {
          p_month_start?: string
          p_status?: Database["public"]["Enums"]["payroll_batch_status"]
        }
        Returns: Json
      }
      payroll_batch_mark_paid: {
        Args: { p_id: string; p_payment_ref?: string }
        Returns: number
      }
      payroll_compute_line_amount: {
        Args: {
          p_duration_minutes: number
          p_rate_amount_vnd: number
          p_rate_unit: Database["public"]["Enums"]["pay_rate_unit"]
        }
        Returns: number
      }
      payroll_payslip_acknowledge: {
        Args: { p_id: string }
        Returns: undefined
      }
      payroll_payslip_confirm: {
        Args: { p_admin_message?: string; p_id: string }
        Returns: undefined
      }
      payroll_payslip_create: {
        Args: { p_batch_id?: string; p_period_id: string }
        Returns: string
      }
      payroll_payslip_get: { Args: { p_id: string }; Returns: Json }
      payroll_payslip_list: {
        Args: {
          p_batch_id?: string
          p_month_start?: string
          p_status?: Database["public"]["Enums"]["payroll_payslip_status"]
          p_teacher_id?: string
        }
        Returns: Json
      }
      payroll_payslip_mark_paid: {
        Args: { p_id: string; p_payment_ref?: string }
        Returns: undefined
      }
      payroll_payslip_rebuild_lines: {
        Args: { p_payslip_id: string }
        Returns: undefined
      }
      payroll_payslip_recalc_totals: {
        Args: { p_payslip_id: string }
        Returns: undefined
      }
      payroll_snapshot_entry_rate: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reassign_class_invitation: {
        Args: {
          p_invitation_id: string
          p_new_teacher_id: string
          p_role?: string
        }
        Returns: Json
      }
      request_invitation_negotiation: {
        Args: {
          p_invitation_id: string
          p_message: string
          p_proposed_rate_amount_vnd?: number
          p_proposed_rate_unit?: string
          p_proposed_role?: string
        }
        Returns: Json
      }
      request_replacement_teacher: {
        Args: { p_class_id: string; p_reason: string; p_teacher_ids?: string[] }
        Returns: Json
      }
      resolve_class_invitation_rate: {
        Args: { p_invitation_id: string }
        Returns: {
          class_id: string
          invitation_id: string
          program: string
          rate_amount_vnd: number
          rate_source: string
          rate_unit: string
          teacher_id: string
        }[]
      }
      respond_invitation_negotiation: {
        Args: {
          p_admin_message: string
          p_invitation_id: string
          p_new_deadline?: string
          p_new_rate_amount_vnd?: number
          p_new_rate_unit?: string
          p_new_role?: string
        }
        Returns: Json
      }
      respond_to_class_invitation: {
        Args: { p_action: string; p_invitation_id: string; p_note?: string }
        Returns: Json
      }
      review_availability_draft: {
        Args: {
          p_draft_id: string
          p_new_status: string
          p_review_note?: string
        }
        Returns: Json
      }
      scrub_exercise_questions: { Args: { qs: Json }; Returns: Json }
      self_link_as_teacher: { Args: never; Returns: Json }
      session_self_checkin_open: {
        Args: { _session_id: string }
        Returns: boolean
      }
      set_class_course_id: {
        Args: { p_class_id: string; p_course_id: string }
        Returns: undefined
      }
      set_invitation_deadline: {
        Args: { p_deadline: string; p_invitation_id: string }
        Returns: Json
      }
      student_self_checkin: { Args: { _session_id: string }; Returns: Json }
      submit_my_capability_draft: {
        Args: {
          p_can_teach_offline: boolean
          p_can_teach_online: boolean
          p_level_keys: string[]
          p_max_hours_per_week?: number
          p_notes?: string
          p_program_keys: string[]
        }
        Returns: Json
      }
      sync_plan_to_template: { Args: { p_plan_id: string }; Returns: boolean }
      teacher_earnings_breakdown: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_teacher_id: string
        }
        Returns: {
          class_id: string
          class_name: string
          duration_minutes: number
          entry_date: string
          entry_id: string
          gross_amount_vnd: number
          program: string
          quantity: number
          rate_amount_vnd: number
          rate_source: string
          rate_unit: string
          timesheet_status: string
        }[]
      }
      teacher_earnings_summary: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_teacher_id: string
        }
        Returns: {
          class_id: string
          class_name: string
          gross_amount_vnd: number
          program: string
          rate_amount_vnd: number
          rate_source: string
          rate_unit: string
          session_count: number
          total_minutes: number
          total_quantity: number
        }[]
      }
      timesheet_assert_entry_editable: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      timesheet_assert_teacher_owner: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      timesheet_entry_confirm: {
        Args: {
          p_actual_end?: string
          p_actual_start?: string
          p_entry_id: string
          p_notes?: string
        }
        Returns: undefined
      }
      timesheet_entry_mark_absent: {
        Args: { p_entry_id: string; p_reason?: string }
        Returns: undefined
      }
      timesheet_entry_mark_cancelled: {
        Args: { p_entry_id: string; p_reason?: string }
        Returns: undefined
      }
      timesheet_entry_mark_substituted: {
        Args: {
          p_entry_id: string
          p_reason?: string
          p_substitute_teacher_id: string
        }
        Returns: undefined
      }
      timesheet_period_approve: {
        Args: { p_message?: string; p_period_id: string }
        Returns: undefined
      }
      timesheet_period_get_or_create: {
        Args: {
          p_month_start: string
          p_sync_existing?: boolean
          p_teacher_id: string
        }
        Returns: string
      }
      timesheet_period_get_with_entries: {
        Args: { p_period_id: string }
        Returns: Json
      }
      timesheet_period_list: {
        Args: {
          p_month_start?: string
          p_status?: Database["public"]["Enums"]["timesheet_period_status"]
          p_teacher_id?: string
        }
        Returns: {
          admin_message: string
          approved_at: string
          created_at: string
          id: string
          locked_at: string
          month_start: string
          pending_count: number
          status: Database["public"]["Enums"]["timesheet_period_status"]
          submitted_at: string
          teacher_full_name: string
          teacher_id: string
          total_minutes: number
          total_taught_count: number
          updated_at: string
        }[]
      }
      timesheet_period_lock: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      timesheet_period_recalc_totals: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      timesheet_period_reopen: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      timesheet_period_request_revision: {
        Args: { p_message: string; p_period_id: string }
        Returns: undefined
      }
      timesheet_period_submit: {
        Args: { p_period_id: string }
        Returns: undefined
      }
      timesheet_period_tick: { Args: never; Returns: Json }
      unlock_session_attendance: {
        Args: { _session_id: string }
        Returns: Json
      }
      update_my_teacher_profile: {
        Args: {
          p_avatar_url?: string
          p_bank_account_holder?: string
          p_bank_account_number?: string
          p_bank_name?: string
          p_bio_long?: string
          p_bio_short?: string
          p_current_address?: string
          p_dob?: string
          p_gender?: string
          p_notification_email_opt_in?: boolean
          p_notification_zalo?: string
          p_phone?: string
          p_signature_url?: string
        }
        Returns: Json
      }
      validate_availability_draft: {
        Args: { p_draft_id: string }
        Returns: Json
      }
    }
    Enums: {
      addendum_status:
        | "draft"
        | "awaiting_teacher"
        | "revision_requested"
        | "awaiting_admin"
        | "active"
        | "superseded"
        | "terminated"
      app_role: "super_admin" | "admin" | "user" | "guest" | "teacher"
      attendance_status_enum:
        | "present"
        | "absent"
        | "late"
        | "excused"
        | "notified_absent"
        | "makeup"
      brand_asset_type:
        | "logo"
        | "favicon"
        | "mascot"
        | "icon"
        | "illustration"
        | "other"
        | "shape"
      cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      class_lifecycle_status:
        | "planning"
        | "recruiting"
        | "recruiting_replacement"
        | "ready"
        | "in_progress"
        | "completed"
        | "postponed"
        | "cancelled"
      contract_field_type:
        | "text"
        | "textarea"
        | "number"
        | "date"
        | "currency"
        | "dropdown"
        | "checkbox"
      contract_party: "teacher" | "admin"
      contract_status:
        | "draft"
        | "awaiting_teacher"
        | "awaiting_admin"
        | "revision_requested"
        | "active"
        | "renewing"
        | "expired"
        | "terminated"
      mascot_quote_tone: "accent" | "warning" | "success"
      pay_rate_unit: "session" | "hour" | "day" | "month"
      payroll_adjustment_type:
        | "bonus"
        | "penalty"
        | "advance"
        | "tax_pit"
        | "other"
      payroll_batch_status: "draft" | "confirmed" | "paid"
      payroll_payslip_status:
        | "draft"
        | "confirmed"
        | "teacher_acknowledged"
        | "paid"
      tax_contract_type: "labor" | "casual"
      tax_declaration_status: "draft" | "submitted" | "approved" | "rejected"
      tax_period_kind: "month" | "quarter" | "year"
      tax_unit: "hour" | "session" | "course" | "lump_sum"
      timesheet_entry_status:
        | "planned"
        | "taught"
        | "cancelled"
        | "teacher_absent"
        | "substituted"
      timesheet_period_status:
        | "open"
        | "submitted"
        | "revision_requested"
        | "approved"
        | "locked"
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
      addendum_status: [
        "draft",
        "awaiting_teacher",
        "revision_requested",
        "awaiting_admin",
        "active",
        "superseded",
        "terminated",
      ],
      app_role: ["super_admin", "admin", "user", "guest", "teacher"],
      attendance_status_enum: [
        "present",
        "absent",
        "late",
        "excused",
        "notified_absent",
        "makeup",
      ],
      brand_asset_type: [
        "logo",
        "favicon",
        "mascot",
        "icon",
        "illustration",
        "other",
        "shape",
      ],
      cefr_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      class_lifecycle_status: [
        "planning",
        "recruiting",
        "recruiting_replacement",
        "ready",
        "in_progress",
        "completed",
        "postponed",
        "cancelled",
      ],
      contract_field_type: [
        "text",
        "textarea",
        "number",
        "date",
        "currency",
        "dropdown",
        "checkbox",
      ],
      contract_party: ["teacher", "admin"],
      contract_status: [
        "draft",
        "awaiting_teacher",
        "awaiting_admin",
        "revision_requested",
        "active",
        "renewing",
        "expired",
        "terminated",
      ],
      mascot_quote_tone: ["accent", "warning", "success"],
      pay_rate_unit: ["session", "hour", "day", "month"],
      payroll_adjustment_type: [
        "bonus",
        "penalty",
        "advance",
        "tax_pit",
        "other",
      ],
      payroll_batch_status: ["draft", "confirmed", "paid"],
      payroll_payslip_status: [
        "draft",
        "confirmed",
        "teacher_acknowledged",
        "paid",
      ],
      tax_contract_type: ["labor", "casual"],
      tax_declaration_status: ["draft", "submitted", "approved", "rejected"],
      tax_period_kind: ["month", "quarter", "year"],
      tax_unit: ["hour", "session", "course", "lump_sum"],
      timesheet_entry_status: [
        "planned",
        "taught",
        "cancelled",
        "teacher_absent",
        "substituted",
      ],
      timesheet_period_status: [
        "open",
        "submitted",
        "revision_requested",
        "approved",
        "locked",
      ],
    },
  },
} as const
