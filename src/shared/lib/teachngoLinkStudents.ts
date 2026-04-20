import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type TeachngoLinkStudentsPayload = {
  action: string;
  [key: string]: unknown;
};

type ErrorPayload = {
  error?: string;
  fallback?: boolean;
};

export type TeachngoLinkStudentsResult<T> = {
  data: T | null;
  error: string | null;
  fallback: boolean;
  status: number | null;
  unauthorized: boolean;
};

async function readErrorPayload(response: Response) {
  try {
    return await response.clone().json() as ErrorPayload;
  } catch {
    try {
      const text = await response.clone().text();
      return { error: text || null } as ErrorPayload & { error: string | null };
    } catch {
      return {} as ErrorPayload;
    }
  }
}

async function normalizeFunctionError(error: unknown): Promise<TeachngoLinkStudentsResult<unknown>> {
  if (error instanceof FunctionsHttpError) {
    const payload = await readErrorPayload(error.context);
    const message = payload.error || error.message || "Yêu cầu thất bại";
    return {
      data: null,
      error: message,
      fallback: payload.fallback === true,
      status: error.context.status,
      unauthorized: error.context.status === 401 || message.toLowerCase().includes("unauthorized"),
    };
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return {
      data: null,
      error: error.message || "Không thể kết nối edge function",
      fallback: false,
      status: null,
      unauthorized: false,
    };
  }

  const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
  return {
    data: null,
    error: message,
    fallback: false,
    status: null,
    unauthorized: message.toLowerCase().includes("unauthorized"),
  };
}

export async function invokeTeachngoLinkStudents<T = Record<string, unknown>>(
  accessToken: string,
  body: TeachngoLinkStudentsPayload,
): Promise<TeachngoLinkStudentsResult<T>> {
  const { data, error } = await supabase.functions.invoke("teachngo-link-students", {
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });

  if (error) {
    return normalizeFunctionError(error);
  }

  const payload = (data ?? null) as (T & ErrorPayload) | null;
  const message = payload && typeof payload === "object" && "error" in payload ? payload.error || null : null;

  if (message) {
    return {
      data: null,
      error: message,
      fallback: Boolean(payload?.fallback),
      status: 200,
      unauthorized: message.toLowerCase().includes("unauthorized"),
    };
  }

  return {
    data: payload as T | null,
    error: null,
    fallback: false,
    status: 200,
    unauthorized: false,
  };
}