-- Making cards from anything, a deck's Guide, and its Sources (see web/make.mjs, web/store.mjs, web/social.mjs).
-- Safe to run on the live database while the old code is still running: it only adds one nullable column and changes nothing else.
--
-- A shared deck carries its Guide, like a README: { pages: [{ id, title, text }], sources: <how many Sources the deck was made from> }.
-- (The first page is the Guide itself; the Sources' files and names are never shared, only the number.) Studying a deck, copying it,
-- and its public page read it from here. Null while the deck has neither a Guide nor a Source.
alter table public.shared_decks add column if not exists guide jsonb;
