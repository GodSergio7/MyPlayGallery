-- MyPlayGallery — límite de tamaño de reseñas y notas (T-21)
-- Con el registro abierto, nadie debe poder guardar textos de varios MB por entrada.
-- El formulario ya limita a 5.000 caracteres; esto lo garantiza también en la base de datos.

alter table public.library_entries
  add constraint library_entries_review_length check (review is null or char_length(review) <= 5000),
  add constraint library_entries_notes_length check (notes is null or char_length(notes) <= 5000);
