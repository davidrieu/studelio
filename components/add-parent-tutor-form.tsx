"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { addParentTutorAction } from "@/actions/student-parent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddParentTutorForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(addParentTutorAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="min-w-0 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="parentEmail">Email du parent ou tuteur</Label>
          <Input
            id="parentEmail"
            name="parentEmail"
            type="email"
            required
            autoComplete="off"
            placeholder="parent@exemple.com"
            aria-invalid={Boolean(state?.ok === false && state.fieldErrors?.parentEmail?.length)}
          />
          {state?.ok === false && state.fieldErrors?.parentEmail?.[0] ? (
            <p className="text-xs text-destructive">{state.fieldErrors.parentEmail[0]}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentPassword">Mot de passe du compte parent</Label>
          <Input
            id="parentPassword"
            name="parentPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={Boolean(state?.ok === false && state.fieldErrors?.parentPassword?.length)}
          />
          {state?.ok === false && state.fieldErrors?.parentPassword?.[0] ? (
            <p className="text-xs text-destructive">{state.fieldErrors.parentPassword[0]}</p>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Si l’adresse n’existe pas encore, un compte parent est créé avec ce mot de passe. S’il existe déjà, le mot de passe
        doit correspondre pour relier ton compte. Aucun email n’est envoyé : communique ces identifiants au parent toi-même.
      </p>
      {state?.ok === false && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      {state?.ok ? (
        <p
          className="rounded-lg border border-[var(--studelio-green-dim)] bg-[var(--studelio-green-dim)]/40 px-3 py-2 text-sm text-[var(--studelio-text)]"
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full rounded-full sm:w-auto">
        Enregistrer le compte parent
      </Button>
    </form>
  );
}
