import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const phoneSchema = z.object({ phone: z.string().min(9) });
const resetSchema = z.object({
  phone: z.string().min(9),
  code: z.string().min(4),
  password: z.string().min(6),
});
const answerResetSchema = z.object({
  phone: z.string().min(9),
  answer: z.string().trim().min(2).max(100),
  password: z.string().min(6),
});
const questionSchema = z.object({
  question: z.enum(["place_of_birth", "year_of_birth"]),
  answer: z.string().trim().min(2).max(100),
});

function normalize(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  if (digits.length === 9) return `255${digits}`;
  return digits;
}

async function hashAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase().replace(/\s+/g, " ");
  const bytes = new TextEncoder().encode(`nafaka:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns which security question a phone number uses (no answer revealed). */
export const getSecurityQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => phoneSchema.parse(input))
  .handler(async ({ data }) => {
    const phone = normalize(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("security_question")
      .eq("phone", phone)
      .maybeSingle();
    return { question: profile?.security_question ?? null };
  });

/** Saves or updates the security question and answer for the signed-in user. */
export const saveSecurityQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => questionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        security_question: data.question,
        security_answer_hash: await hashAnswer(data.answer),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Verifies the security answer and sets a new password. */
export const resetPasswordWithAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => answerResetSchema.parse(input))
  .handler(async ({ data }) => {
    const phone = normalize(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, security_answer_hash")
      .eq("phone", phone)
      .maybeSingle();

    if (!profile?.security_answer_hash) {
      throw new Error("No security question is set for this number. Please contact the shop admin.");
    }
    if ((await hashAnswer(data.answer)) !== profile.security_answer_hash) {
      throw new Error("That answer is not correct.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });


/** Sends a 6-digit reset code by SMS through Africa's Talking. */
export const requestResetCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => phoneSchema.parse(input))
  .handler(async ({ data }) => {
    const phone = normalize(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    // Always answer the same way so phone numbers cannot be enumerated.
    if (!profile) return { ok: true as const };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await supabaseAdmin.from("password_reset_codes").insert({
      phone,
      code,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });

    const apiKey = process.env["AFRICASTALKING_API_KEY"];
    const username = process.env["AFRICASTALKING_USERNAME"];
    if (!apiKey || !username) {
      return {
        ok: true as const,
        smsConfigured: false,
        message: "SMS sending is not configured yet.",
      };
    }

    const body = new URLSearchParams({
      username,
      to: `+${phone}`,
      message: `Nafaka Stock Manager: your password reset code is ${code}. It expires in 10 minutes.`,
    });
    const senderId = process.env["AFRICASTALKING_SENDER_ID"];
    if (senderId) body.set("from", senderId);

    const endpoint =
      username === "sandbox"
        ? "https://api.sandbox.africastalking.com/version1/messaging"
        : "https://api.africastalking.com/version1/messaging";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    const resultText = await res.text();
    console.log("Africa's Talking response", endpoint, res.status, resultText);
    if (!res.ok) {
      return { ok: true as const, smsConfigured: true, message: "Could not send the SMS." };
    }
    try {
      const parsed = JSON.parse(resultText);
      const recipients = parsed?.SMSMessageData?.Recipients;
      if (Array.isArray(recipients) && recipients[0] && recipients[0].status !== "Success") {
        console.error("Africa's Talking delivery status", recipients[0]);
        return {
          ok: true as const,
          smsConfigured: true,
          message: `SMS not delivered: ${recipients[0].status}`,
        };
      }
    } catch { /* non-JSON response */ }
    return { ok: true as const, smsConfigured: true };
  });

/** Verifies the code and sets a new password. */
export const resetPasswordWithCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data }) => {
    const phone = normalize(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("password_reset_codes")
      .select("id, expires_at")
      .eq("phone", phone)
      .eq("code", data.code)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("This code is invalid or has expired.");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (!profile) throw new Error("Account not found.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("password_reset_codes").update({ used: true }).eq("id", row.id);
    return { ok: true as const };
  });
