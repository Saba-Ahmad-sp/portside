"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, api } from "@/lib/api/client";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { MemberDTO } from "@/lib/types";

const signInSchema = z.object({
  email: z.email({ error: "Enter the email address you were given." }),
  password: z.string().min(1, { error: "Enter your password." }),
});

type SignInValues = z.infer<typeof signInSchema>;

const DEMO_PASSWORD = "PortsideDemo!2026";

/**
 * `?demo=admin` prefills the form from the credentials panel.
 *
 * Present because a password manager autofilling a saved credential over the
 * demo one is an easy way for a reviewer to conclude the app is broken when it
 * is not. One click removes that whole class of problem.
 */
const DEMO_ACCOUNTS: Record<string, string> = {
  admin: "admin@portside.demo",
  priya: "priya@portside.demo",
  rahul: "rahul@portside.demo",
};

/**
 * Asks the server who we are.
 *
 * 200 — the account is live. 403 — it exists but access has been withdrawn.
 * 401 — no session at all.
 *
 * Pass a token when the cookie may not have landed yet; otherwise the browser's
 * own session is used.
 */
function readSession(accessToken?: string) {
  return api.get<MemberDTO>(
    "/api/session",
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  );
}

/**
 * Sign-in.
 *
 * The one place the browser talks to Supabase directly — and only to Auth,
 * never to a table. Supabase sets the httpOnly session cookie, and from then on
 * every request for data goes through /api/*, where the DAL revalidates the
 * session and the service layer authorises the action.
 *
 * Note the extra step after a successful password check. Supabase Auth has no
 * concept of `is_active` — that is our column, in our profiles table — so a
 * deactivated colleague's password still works and still yields a valid
 * session. Somebody has to notice, and it has to be us.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const demoEmail = DEMO_ACCOUNTS[searchParams.get("demo") ?? ""];
  const revoked = searchParams.get("revoked") === "1";

  /**
   * Turn away an authenticated-but-deactivated account.
   *
   * Signing out matters as much as the message: without it the browser keeps a
   * live cookie for a dead account, and every visit to the app bounces back
   * here. `scope: "local"` because this is about this browser, not about
   * revoking the account's other sessions — that is an admin's decision.
   */
  const denyAccess = useCallback(async (message: string) => {
    await getBrowserSupabase().auth.signOut({ scope: "local" });
    setFormError(message);
    toast.error("Access disabled", { description: message });
  }, []);

  /**
   * Arriving with ?revoked=1 means a page turned us away mid-session — the
   * admin switched this account off while it was signed in.
   *
   * The marker is not taken on trust: anyone can type it in the address bar,
   * and signing out a perfectly valid user because they did would be its own
   * bug. Ask the server, then act on the answer.
   */
  useEffect(() => {
    if (!revoked) return;
    let cancelled = false;

    void (async () => {
      try {
        await readSession();
        // Access is fine after all — the marker was stale or invented.
        if (!cancelled) router.replace("/leads");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.isForbidden) {
          await denyAccess(error.message);
        } else {
          // 401: already signed out, nothing to explain. Tidy the URL.
          router.replace("/login");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [revoked, router, denyAccess]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    // The page keys this component on ?demo=, so picking a different account
    // remounts the form and these apply again. Using RHF's `values` prop
    // instead would make the inputs fully controlled and reset them on every
    // keystroke.
    defaultValues: demoEmail
      ? { email: demoEmail, password: DEMO_PASSWORD }
      : { email: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    setFormError(null);

    const { data, error } = await getBrowserSupabase().auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Deliberately vague: distinguishing "no such user" from "wrong password"
      // would let anyone enumerate who works here.
      setFormError("That email and password combination did not work.");
      return;
    }

    /*
      The password was right. That is not the same as being allowed in.

      Checked here rather than left to the app to discover, because the app
      discovering it is a redirect the user watches happen for no stated
      reason. Told at the door, it is an answer.
    */
    try {
      await readSession(data.session?.access_token);
    } catch (checkError) {
      if (checkError instanceof ApiClientError && checkError.isForbidden) {
        await denyAccess(checkError.message);
        return;
      }
      // Anything else is a network hiccup, not a verdict. Carry on — the DAL
      // re-checks on the page itself, so nothing gets in on our uncertainty.
    }

    // Send them where they were originally headed, if they were bounced here.
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/leads");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div>
        <Label htmlFor="email" className="label-manifest">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="admin@portside.demo"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="mt-1.5"
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1.5 text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password" className="label-manifest">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="mt-1.5"
          {...register("password")}
        />
        {errors.password && (
          <p
            id="password-error"
            role="alert"
            className="mt-1.5 text-xs text-destructive"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {formError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
        >
          {formError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="group w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Signing in
          </>
        ) : (
          <>
            Sign in
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </>
        )}
      </Button>
    </form>
  );
}
