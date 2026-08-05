"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddNote, useNotes } from "@/lib/hooks/use-lead";
import { formatAbsolute, formatRelative } from "@/lib/format";
import { can, type PermissionUser } from "@/lib/permissions";
import type { NoteDTO } from "@/lib/types";

const MAX_LENGTH = 4000;

/**
 * Notes — what a person wrote, and when.
 *
 * Append-only by design, all the way down: no edit or delete control here, no
 * PATCH or DELETE route, and no UPDATE or DELETE grant on the table. A note is
 * a record of what was said at a moment; editing it later would undermine the
 * trail it sits beside.
 */
export function NotesPanel({
  leadId,
  assignedTo,
  viewer,
  initialNotes,
}: {
  leadId: string;
  assignedTo: string | null;
  viewer: PermissionUser;
  initialNotes: NoteDTO[];
}) {
  const reduceMotion = useReducedMotion();
  const [body, setBody] = useState("");

  const { data: notes } = useNotes(leadId, initialNotes);
  const addNote = useAddNote(leadId);

  const mayWrite = can(viewer, "lead:addNote", { assignedTo });
  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX_LENGTH;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed || tooLong) return;

    await addNote.mutateAsync(trimmed).then(() => setBody(""));
  }

  return (
    <section aria-labelledby="notes-heading" className="space-y-4">
      <h2 id="notes-heading" className="label-manifest">
        Notes
      </h2>

      {mayWrite ? (
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="note-body" className="sr-only">
            Add a note
          </label>
          <Textarea
            id="note-body"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            // Keep the "Called the buyer" opening — an E2E test locates this
            // field by it.
            placeholder="Called the buyer, shared landed pricing and lead times for the helmet order…"
            aria-invalid={tooLong}
            className="resize-y bg-card text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            <span
              data-numeric
              className={
                tooLong
                  ? "font-mono text-[0.6875rem] text-destructive"
                  : "font-mono text-[0.6875rem] text-muted-foreground"
              }
            >
              {trimmed.length} / {MAX_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={!trimmed || tooLong || addNote.isPending}
            >
              {addNote.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Saving
                </>
              ) : (
                <>
                  <MessageSquarePlus className="size-3.5" aria-hidden />
                  Add note
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
          Only the owner of this lead, or an admin, can add notes.
        </p>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. The first call is usually worth writing down.
        </p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.li
                key={note.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-md border border-border bg-card p-3.5"
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {note.body}
                </p>
                <p className="mt-2.5 flex flex-wrap items-center gap-x-2 font-mono text-[0.6875rem] text-muted-foreground">
                  <span>{note.author?.fullName ?? "Removed user"}</span>
                  <span aria-hidden>·</span>
                  <time
                    dateTime={note.createdAt}
                    title={formatAbsolute(note.createdAt)}
                  >
                    {formatRelative(note.createdAt)}
                  </time>
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
