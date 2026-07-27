"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import type { CertificateTemplate } from "@/types/database";
import { emptyFormState } from "@/lib/form";
import { useT } from "@/lib/i18n/client";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTemplate, updateTemplate } from "./actions";
import {
  externalReferencesIn,
  KNOWN_PLACEHOLDERS,
  placeholdersIn,
} from "./schema";

/**
 * Create/edit a certificate template. The SVG can be pasted or picked from
 * disk — the file is read in the browser and its text dropped into the textarea,
 * so the server action still receives a plain string (a designer SVG is a few
 * hundred KB, which is fine as a form field but tedious to paste by hand).
 *
 * Live feedback below the field lists which `{{placeholder}}` slots the SVG
 * actually contains and flags external references, because both failure modes
 * are invisible until a certificate is issued: outlined placeholder text has no
 * token to substitute, and a linked image silently drops out when the SVG is
 * rasterised server-side.
 */
export function TemplateForm({
  template,
}: {
  template?: CertificateTemplate;
}) {
  const isEdit = Boolean(template);
  const t = useT();
  const [state, formAction] = useActionState(
    isEdit ? updateTemplate : createTemplate,
    emptyFormState,
  );
  const [svg, setSvg] = useState(template?.svg_template ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const found = useMemo(() => placeholdersIn(svg), [svg]);
  const external = useMemo(() => externalReferencesIn(svg), [svg]);
  const unknown = found.filter(
    (name) => !(KNOWN_PLACEHOLDERS as readonly string[]).includes(name),
  );

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setSvg(await file.text());
  }

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={template!.id} />}

      <Field
        label={t("admin.templates.name_label")}
        htmlFor={`name-${template?.id ?? "new"}`}
        required
        error={state.fieldErrors?.name}
        hint={t("admin.templates.name_hint")}
      >
        <Input
          id={`name-${template?.id ?? "new"}`}
          name="name"
          defaultValue={template?.name ?? ""}
          required
          maxLength={120}
        />
      </Field>

      <Field
        label={t("admin.templates.svg_label")}
        htmlFor={`svg-${template?.id ?? "new"}`}
        required
        error={state.fieldErrors?.svg_template}
        hint={t("admin.templates.svg_hint")}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(event) => onPickFile(event.target.files?.[0])}
              className="text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-slate-300 file:bg-white file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
            />
            {svg.length > 0 && (
              <span className="text-xs text-slate-400">
                {t("admin.templates.svg_size", {
                  kb: Math.round(svg.length / 1024),
                })}
              </span>
            )}
          </div>
          <Textarea
            id={`svg-${template?.id ?? "new"}`}
            name="svg_template"
            value={svg}
            onChange={(event) => setSvg(event.target.value)}
            rows={6}
            required
            spellCheck={false}
            className="font-mono text-xs"
          />
        </div>
      </Field>

      {svg.length > 0 && (
        <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("admin.templates.detected_placeholders")}
          </p>
          {found.length === 0 ? (
            <p className="text-xs text-red-600">
              {t("admin.templates.no_placeholders")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {found.map((name) => (
                <Badge
                  key={name}
                  tone={
                    (KNOWN_PLACEHOLDERS as readonly string[]).includes(name)
                      ? "success"
                      : "warning"
                  }
                >
                  {`{{${name}}}`}
                </Badge>
              ))}
            </div>
          )}
          {unknown.length > 0 && (
            <p className="text-xs text-amber-700">
              {t("admin.templates.unknown_placeholders", {
                names: unknown.join(", "),
              })}
            </p>
          )}
          {external.length > 0 && (
            <p className="text-xs text-red-600">
              {t("admin.templates.external_refs", {
                refs: external.slice(0, 3).join(", "),
              })}
            </p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="active"
          defaultChecked={template?.active ?? true}
          className="h-4 w-4 accent-brand-600"
        />
        {t("common.active")}
      </label>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton pendingText={t("common.saving")}>
        {isEdit ? t("common.save_changes") : t("admin.templates.create_button")}
      </SubmitButton>
    </form>
  );
}
