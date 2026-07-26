"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserSupabase } from "@/lib/supabase/client";

const signInSchema = z.object({
  email: z.email({ error: "Enter the email address you were given." }),
  password: z.string().min(1, { error: "Enter your password." }),
});

type SignInValues = z.infer<typeof signInSchema>;

/**
 * Sign-in.
 *
 * The one place the browser talks to Supabase directly — and only to Auth,
 * never to a table. Supabase sets the httpOnly session cookie, and from then on
 * every request for data goes through /api/*, where the DAL revalidates the
 * session and the service layer authorises the action.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    setFormError(null);

    const { error } = await getBrowserSupabase().auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Deliberately vague: distinguishing "no such user" from "wrong password"
      // would let anyone enumerate who works here.
      setFormError("That email and password combination did not work.");
      return;
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
