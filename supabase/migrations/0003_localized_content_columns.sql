set search_path = public;

alter table public.courses add column if not exists title_de text;
alter table public.courses add column if not exists title_en text;
alter table public.courses add column if not exists description_de text;
alter table public.courses add column if not exists description_en text;
update public.courses set title_de = title where title_de is null;
update public.courses set description_de = description
  where description_de is null and description is not null;

alter table public.course_topics add column if not exists title_de text;
alter table public.course_topics add column if not exists title_en text;
update public.course_topics set title_de = title where title_de is null;

alter table public.questions add column if not exists question_text_de text;
alter table public.questions add column if not exists question_text_en text;
alter table public.questions add column if not exists explanation_de text;
alter table public.questions add column if not exists explanation_en text;
alter table public.questions add column if not exists recommendation_text_de text;
alter table public.questions add column if not exists recommendation_text_en text;
update public.questions set question_text_de = question_text where question_text_de is null;
update public.questions set explanation_de = explanation
  where explanation_de is null and explanation is not null;
update public.questions set recommendation_text_de = recommendation_text
  where recommendation_text_de is null and recommendation_text is not null;

alter table public.question_options add column if not exists option_text_de text;
alter table public.question_options add column if not exists option_text_en text;
update public.question_options set option_text_de = option_text where option_text_de is null;

alter table public.questionnaires add column if not exists title_de text;
alter table public.questionnaires add column if not exists title_en text;
alter table public.questionnaires add column if not exists description_de text;
alter table public.questionnaires add column if not exists description_en text;
update public.questionnaires set title_de = title where title_de is null;
update public.questionnaires set description_de = description
  where description_de is null and description is not null;

create or replace function public.guard_questions_update()
returns trigger
language plpgsql
as $$
begin
  if public.question_is_locked(old.id) then
    if (new.question_text, new.question_type, new.course_id, new.topic_id,
        new.explanation, new.recommendation_text,
        new.question_text_de, new.question_text_en,
        new.explanation_de, new.explanation_en,
        new.recommendation_text_de, new.recommendation_text_en)
       is distinct from
       (old.question_text, old.question_type, old.course_id, old.topic_id,
        old.explanation, old.recommendation_text,
        old.question_text_de, old.question_text_en,
        old.explanation_de, old.explanation_en,
        old.recommendation_text_de, old.recommendation_text_en) then
      raise exception 'Question % is locked; only its active status can change', old.id;
    end if;
  end if;
  return new;
end;
$$;
