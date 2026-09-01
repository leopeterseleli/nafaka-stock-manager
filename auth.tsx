import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wheat, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isValidPhone, normalizePhone, phoneToEmail } from "@/lib/phone";
import {
  getSecurityQuestion,
  resetPasswordWithAnswer,
  saveSecurityQuestion,
} from "@/lib/password-reset.functions";

const QUESTIONS = {
  place_of_birth: "Place of birth / Mahali ulipozaliwa",
  year_of_birth: "Year of birth / Mwaka wa kuzaliwa",
} as const;
type QuestionKey = keyof typeof QUESTIONS;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Sign in with your phone number to manage nafaka stock, sales, commission and supplier balances.",
      },
      { property: "og:title", content: "Sign in — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Phone-number login for Tanzanian wholesale nafaka shops.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");

  const fetchQuestion = useServerFn(getSecurityQuestion);
  const doReset = useServerFn(resetPasswordWithAnswer);
  const saveQuestion = useServerFn(saveSecurityQuestion);
  const [question, setQuestion] = useState<QuestionKey | null>(null);
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [regQuestion, setRegQuestion] = useState<QuestionKey>("place_of_birth");
  const [regAnswer, setRegAnswer] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) { toast.error("Enter a valid Tanzanian phone number"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });
    setBusy(false);
    if (error) { toast.error("Wrong phone number or password"); return; }
    navigate({ to: "/dashboard" });
  }

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) { toast.error("Enter a valid Tanzanian phone number"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (regAnswer.trim().length < 2) { toast.error("Answer your security question"); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error || !data.user) {
      setBusy(false);
      { toast.error(error?.message ?? "Could not create the account"); return; }
    }
    const { error: pErr } = await supabase.from("profiles").insert({
      id: data.user.id,
      phone: normalizePhone(phone),
      full_name: fullName || null,
      shop_name: shopName || "Nafaka Shop",
    });
    try {
      await saveQuestion({ data: { question: regQuestion, answer: regAnswer } });
    } catch {
      toast.warning("Account created, but the security question was not saved.");
    }
    setBusy(false);
    if (pErr) { toast.error(pErr.message); return; }
    toast.success("Karibu! Account created.");
    navigate({ to: "/dashboard" });
  }

  async function handleLoadQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) { toast.error("Enter a valid Tanzanian phone number"); return; }
    setBusy(true);
    try {
      const res = await fetchQuestion({ data: { phone } });
      if (!res.question) {
        toast.error("No security question is set for this number.");
      } else {
        setQuestion(res.question as QuestionKey);
      }
    } catch {
      toast.error("Could not load the security question");
    }
    setBusy(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await doReset({ data: { phone, answer, password: newPassword } });
      toast.success("Password updated. Please sign in.");
      setMode("auth");
      setQuestion(null);
      setAnswer("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wheat className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Nafaka Stock Manager</h1>
          <p className="text-sm text-muted-foreground">
            Usimamizi wa nafaka — stock, mauzo na faida
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          {mode === "auth" ? (
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={login} className="space-y-3 pt-3">
                  <Field label="Phone number / Namba ya simu">
                    <Input
                      inputMode="tel"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Field>
                  <Field label="Password / Neno la siri">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="w-full text-center text-xs text-muted-foreground underline"
                  >
                    Forgot password?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={register} className="space-y-3 pt-3">
                  <Field label="Shop name / Jina la duka">
                    <Input value={shopName} onChange={(e) => setShopName(e.target.value)} />
                  </Field>
                  <Field label="Owner name / Jina lako">
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </Field>
                  <Field label="Phone number / Namba ya simu">
                    <Input
                      inputMode="tel"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Field>
                  <Field label="Password / Neno la siri">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Field label="Security question / Swali la usalama">
                    <select
                      value={regQuestion}
                      onChange={(e) => setRegQuestion(e.target.value as QuestionKey)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="place_of_birth">{QUESTIONS.place_of_birth}</option>
                      <option value="year_of_birth">{QUESTIONS.year_of_birth}</option>
                    </select>
                  </Field>
                  <Field label="Answer / Jibu">
                    <Input value={regAnswer} onChange={(e) => setRegAnswer(e.target.value)} />
                  </Field>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={question ? handleReset : handleLoadQuestion} className="space-y-3">
              <h2 className="text-base font-semibold">Reset password</h2>
              <p className="text-xs text-muted-foreground">
                Answer your security question / Jibu swali lako la usalama
              </p>
              <Field label="Phone number / Namba ya simu">
                <Input
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!!question}
                />
              </Field>
              {question ? (
                <>
                  <Field label={QUESTIONS[question]}>
                    <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
                  </Field>
                  <Field label="New password">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </Field>
                </>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : question ? (
                  "Set new password"
                ) : (
                  "Continue"
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setMode("auth");
                  setQuestion(null);
                }}
                className="w-full text-center text-xs text-muted-foreground underline"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
