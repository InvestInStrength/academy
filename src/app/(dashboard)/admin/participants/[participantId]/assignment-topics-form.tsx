"use client";

import { useActionState, useState } from "react";

import { emptyFormState } from "@/lib/form";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateAssignmentTopics } from "../actions";

type TopicOption = { id: string; title: string };

type Props = {
  assignmentId: string;
  topics: TopicOption[];
  selectedTopicIds: string[];
};

export function AssignmentTopicsForm({
  assignmentId,
  topics,
  selectedTopicIds,
}: Props) {
  const [state, formAction] = useActionState(updateAssignmentTopics, emptyFormState);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedTopicIds),
  );

  const ordered = topics.filter((t) => selected.has(t.id)).map((t) => t.id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (topics.length === 0) {
    return (
      <p className="text-xs text-slate-500">No topics in this course.</p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <input type="hidden" name="topic_ids" value={JSON.stringify(ordered)} />

      <ul className="space-y-1">
        {topics.map((topic) => (
          <li key={topic.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.has(topic.id)}
                onChange={() => toggle(topic.id)}
                className="h-4 w-4 accent-brand-600"
              />
              {topic.title}
            </label>
          </li>
        ))}
      </ul>

      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>
          {state.message}
        </FormMessage>
      )}

      <SubmitButton size="sm" variant="outline" pendingText="Saving…">
        Save topics
      </SubmitButton>
    </form>
  );
}
