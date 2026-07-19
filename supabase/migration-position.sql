-- Adds a manual sort position to problems so they can be reordered via drag-and-drop.
-- Nullable: a null position means "fall back to the seed sheet's array order".
-- Fractional (double precision) so a problem can be dropped between two neighbours
-- by writing the midpoint of their positions — no bulk re-numbering needed.
alter table public.user_problems
  add column if not exists position double precision;
