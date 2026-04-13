"use client";

import "@uploadthing/react/styles.css";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createProgrammeDictationAction,
  deleteProgrammeDictationAction,
  updateProgrammeDictationAction,
} from "@/actions/admin-dictation";
import { DictationMediaUploadButton } from "@/lib/uploadthing-components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProgrammeDictation } from "@prisma/client";

type Row = Pick<ProgrammeDictation, "id" | "title" | "audioUrl" | "correctedText" | "order">;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="rounded-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

function CreateForm({ programmeId }: { programmeId: string }) {
  const router = useRouter();
  const [audioUrl, setAudioUrl] = useState("");
  const [state, formAction] = useFormState(createProgrammeDictationAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const uploadConfigured = Boolean(process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID?.trim());

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setAudioUrl("");
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4 rounded-[20px] border border-[var(--studelio-border)] bg-card p-6">
      <input type="hidden" name="programmeId" value={programmeId} />
      <h2 className="font-display text-lg font-semibold">Nouvelle dictée</h2>
      <div className="space-y-2">
        <Label htmlFor="new-title">Titre</Label>
        <Input id="new-title" name="title" required placeholder="Dictée n°3 — accord du participe passé" />
      </div>
      <div className="space-y-2">
        <Label>Fichier dictée (.mp3, .m4a, .mp4…)</Label>
        {uploadConfigured ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <DictationMediaUploadButton
              endpoint="dictationMedia"
              onClientUploadComplete={(res) => {
                const u = res[0]?.url;
                if (u) setAudioUrl(u);
              }}
              appearance={{
                button: "ut-ready:bg-[var(--studelio-blue)] ut-uploading:cursor-not-allowed ut-ready:rounded-full",
                allowedContent: "text-xs text-muted-foreground",
              }}
            />
            <span className="text-xs text-muted-foreground">
              Le fichier est hébergé sur Uploadthing ; l’URL est remplie automatiquement ci-dessous.
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pour <strong>joindre un fichier</strong> : configure{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_UPLOADTHING_APP_ID</code> (identique au dashboard Uploadthing) et
            les clés serveur dans <code className="rounded bg-muted px-1">.env</code>. Sinon indique une URL directe.
          </p>
        )}
        <Label htmlFor="new-audioUrl" className="pt-2">
          URL du média (remplie après upload, ou saisie manuelle)
        </Label>
        <Input
          id="new-audioUrl"
          name="audioUrl"
          required
          type="url"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://… (obligatoire pour enregistrer)"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-correctedText">Texte corrigé (référence officielle)</Label>
        <textarea
          id="new-correctedText"
          name="correctedText"
          required
          rows={6}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-order">Ordre (0 = premier)</Label>
        <Input id="new-order" name="order" type="number" min={0} defaultValue={0} />
      </div>
      {state?.ok === false ? <p className="text-sm text-destructive">{state.message}</p> : null}
      {state?.ok === false && state.fieldErrors
        ? Object.entries(state.fieldErrors).map(([k, v]) => (
            <p key={k} className="text-xs text-destructive">
              {k}: {v?.[0]}
            </p>
          ))
        : null}
      {state?.ok ? <p className="text-sm text-[var(--studelio-green-dim)]">{state.message}</p> : null}
      <SubmitButton label="Ajouter la dictée" />
    </form>
  );
}

function EditRow({ programmeId, row }: { programmeId: string; row: Row }) {
  const router = useRouter();
  const [audioUrl, setAudioUrl] = useState(row.audioUrl);
  const [state, formAction] = useFormState(updateProgrammeDictationAction, undefined);
  const uploadConfigured = Boolean(process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID?.trim());

  useEffect(() => {
    setAudioUrl(row.audioUrl);
  }, [row.audioUrl]);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <li className="rounded-[20px] border border-[var(--studelio-border)] bg-[var(--studelio-bg-soft)]/30 p-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="programmeId" value={programmeId} />
        <div className="space-y-1">
          <Label>Titre</Label>
          <Input name="title" required defaultValue={row.title} />
        </div>
        <div className="space-y-2">
          <Label>Fichier (.mp3, .mp4…)</Label>
          {uploadConfigured ? (
            <DictationMediaUploadButton
              endpoint="dictationMedia"
              onClientUploadComplete={(res) => {
                const u = res[0]?.url;
                if (u) setAudioUrl(u);
              }}
              appearance={{
                button: "ut-ready:bg-[var(--studelio-blue)] ut-ready:rounded-full text-xs",
                allowedContent: "hidden",
              }}
            />
          ) : null}
          <Label className="text-xs font-normal text-muted-foreground">URL du média</Label>
          <Input name="audioUrl" required type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Texte corrigé</Label>
          <textarea
            name="correctedText"
            required
            rows={5}
            defaultValue={row.correctedText}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <Label>Ordre</Label>
          <Input name="order" type="number" min={0} required defaultValue={row.order} />
        </div>
        {state?.ok === false ? <p className="text-xs text-destructive">{state.message}</p> : null}
        {state?.ok ? <p className="text-xs text-green-700 dark:text-green-400">{state.message}</p> : null}
        <SubmitButton label="Enregistrer" />
      </form>
      <form
        className="mt-3"
        action={async (fd) => {
          await deleteProgrammeDictationAction(fd);
          router.refresh();
        }}
      >
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="programmeId" value={programmeId} />
        <Button type="submit" variant="destructive" size="sm" className="rounded-full">
          Supprimer
        </Button>
      </form>
    </li>
  );
}

export function AdminDictationsPanel({
  programmeId,
  initialRows,
}: {
  programmeId: string;
  initialRows: Row[];
}) {
  const sorted = [...initialRows].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return (
    <div className="space-y-10">
      <CreateForm programmeId={programmeId} />
      <div>
        <h2 className="font-display text-lg font-semibold">Dictées existantes ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucune dictée pour ce programme.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {sorted.map((row) => (
              <EditRow key={row.id} programmeId={programmeId} row={row} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
