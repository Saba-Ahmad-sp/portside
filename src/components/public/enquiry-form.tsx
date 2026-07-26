"use client";

import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, api } from "@/lib/api/client";
import {
  publicLeadSchema,
  type PublicLeadInput,
  type PublicLeadValues,
} from "@/lib/schemas/lead";
import { cn } from "@/lib/utils";

/**
 * The public capture form.
 *
 * Five required fields and four optional ones. A nine-field wall would cost
 * more enquiries than the extra data is worth, so the optional half is folded
 * away until someone wants it.
 *
 * Validated by the SAME Zod schema the API uses. The browser copy is a
 * convenience for the person typing; the server never trusts it.
 */

type FieldName = keyof PublicLeadValues;

type Field = {
  name: FieldName;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
};

const REQUIRED_FIELDS: Field[] = [
  { name: "fullName", label: "Your name", placeholder: "Amara Okafor", required: true },
  { name: "email", label: "Work email", placeholder: "you@company.com", type: "email", required: true },
  { name: "company", label: "Company", placeholder: "Westbridge Foods Ltd", required: true },
  { name: "country", label: "Destination country", placeholder: "United Kingdom", required: true },
];

const OPTIONAL_FIELDS: Field[] = [
  { name: "phone", label: "Phone or WhatsApp", placeholder: "+44 7700 900000" },
  { name: "productInterest", label: "Product interest", placeholder: "Basmati rice, 25kg bags" },
  { name: "quantity", label: "Estimated quantity", placeholder: "2400", type: "number" },
];

type FormApi = UseFormReturn<PublicLeadValues, unknown, PublicLeadInput>;

export function EnquiryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const reduceMotion = useReducedMotion();

  /**
   * Three generics, not one: <what the form holds, context, what the schema
   * produces>. Needed because `quantity` is coerced from string to number.
   */
  const form = useForm<PublicLeadValues, unknown, PublicLeadInput>({
    resolver: zodResolver(publicLeadSchema),
    defaultValues: {
      fullName: "",
      email: "",
      company: "",
      country: "",
      message: "",
      phone: "",
      productInterest: "",
      website: "",
    },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(values: PublicLeadInput) {
    try {
      await api.post<{ id: string }>("/api/public/leads", values);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiClientError && error.fields) {
        // Surface server-side field errors on the same inputs RHF manages, so
        // the server stays the authority without a separate error UI.
        for (const [field, messages] of Object.entries(error.fields)) {
          setError(field as FieldName, { message: messages[0] });
        }
        return;
      }
      toast.error("We could not send that", {
        description:
          error instanceof ApiClientError
            ? error.message
            : "Please try again in a moment.",
      });
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-8"
        role="status"
        aria-live="polite"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-status-won/15 text-status-won">
          <Check className="size-5" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h3 className="font-display text-xl">Enquiry received</h3>
          <p className="max-w-prose text-sm text-muted-foreground">
            It is on the desk now and assigned within the hour. Someone from the
            trade team will come back to you with pricing and lead times.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            form.reset();
            setSubmitted(false);
          }}
          className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Send another
        </button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-lg border border-border bg-card p-6 sm:p-8"
    >
      <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
        {REQUIRED_FIELDS.map((field) => (
          <FormField
            key={field.name}
            field={field}
            error={errors[field.name]?.message}
            register={register}
          />
        ))}

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="message" required>
            What are you looking for?
          </FieldLabel>
          <Textarea
            id="message"
            rows={4}
            placeholder="Product, grade, volume, and when you need it."
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "message-error" : undefined}
            className="mt-1.5 resize-y bg-background"
            {...register("message")}
          />
          <FieldError id="message-error" message={errors.message?.message} />
        </div>
      </div>

      {/* Optional detail, folded away so the form reads as four fields. */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowOptional((open) => !open)}
          aria-expanded={showOptional}
          className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {showOptional ? "Hide" : "Add"} phone, product and quantity
        </button>

        {showOptional && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 grid grid-cols-1 gap-x-5 gap-y-5 overflow-hidden sm:grid-cols-2"
          >
            {OPTIONAL_FIELDS.map((field) => (
              <FormField
                key={field.name}
                field={field}
                error={errors[field.name]?.message}
                register={register}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Honeypot. Off-screen rather than display:none, which some bots skip. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          No account needed. We reply to every enquiry.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="group bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Sending
            </>
          ) : (
            <>
              Send enquiry
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field primitives — one definition, used by both field groups              */
/* -------------------------------------------------------------------------- */

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="label-manifest">
      {children}
      {required && (
        <span aria-hidden className="ml-1 text-brass">
          *
        </span>
      )}
    </Label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-destructive">
      {message}
    </p>
  );
}

function FormField({
  field,
  error,
  register,
  className,
}: {
  field: Field;
  error?: string;
  register: FormApi["register"];
  className?: string;
}) {
  const errorId = `${field.name}-error`;

  return (
    <div className={cn(className)}>
      <FieldLabel htmlFor={field.name} required={field.required}>
        {field.label}
      </FieldLabel>
      <Input
        id={field.name}
        type={field.type ?? "text"}
        placeholder={field.placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="mt-1.5 bg-background"
        {...register(field.name)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
