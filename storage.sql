-- ============================================================
-- SYSTEM MG - SUPABASE STORAGE + COLUMNAS DE IMAGEN
-- Ejecutar DESPUÉS de database.sql
-- ============================================================

-- ============================================================
-- BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('productos',   'productos',   TRUE, 5242880,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']),
  ('cabanas',     'cabanas',     TRUE, 10485760,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('categorias',  'categorias',  TRUE, 2097152,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/svg+xml']),
  ('eventos',     'eventos',     TRUE, 10485760,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('servicios',   'servicios',   TRUE, 5242880,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- POLÍTICAS DE STORAGE
-- ============================================================

-- ---- PRODUCTOS ----
CREATE POLICY "productos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'productos');

CREATE POLICY "productos_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'productos');

CREATE POLICY "productos_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'productos');

CREATE POLICY "productos_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'productos');

-- ---- CABANAS ----
CREATE POLICY "cabanas_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cabanas');

CREATE POLICY "cabanas_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cabanas');

CREATE POLICY "cabanas_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cabanas');

CREATE POLICY "cabanas_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cabanas');

-- ---- CATEGORIAS ----
CREATE POLICY "categorias_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categorias');

CREATE POLICY "categorias_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'categorias');

CREATE POLICY "categorias_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'categorias');

CREATE POLICY "categorias_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'categorias');

-- ---- EVENTOS ----
CREATE POLICY "eventos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'eventos');

CREATE POLICY "eventos_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'eventos');

CREATE POLICY "eventos_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'eventos');

CREATE POLICY "eventos_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'eventos');

-- ---- SERVICIOS ----
CREATE POLICY "servicios_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'servicios');

CREATE POLICY "servicios_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'servicios');

CREATE POLICY "servicios_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'servicios');

CREATE POLICY "servicios_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'servicios');

-- ============================================================
-- COLUMNAS DE IMAGEN EN TABLAS
-- ============================================================

-- Productos: una imagen principal
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Cabañas: imagen principal + galería de fotos
ALTER TABLE cabanas
  ADD COLUMN IF NOT EXISTS imagen_url   TEXT,
  ADD COLUMN IF NOT EXISTS imagenes     JSONB NOT NULL DEFAULT '[]';
  -- imagenes: [{ url: "...", orden: 1 }, ...]

-- Categorías: imagen/icono personalizado
ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Eventos: imagen del evento
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Servicios catálogo: imagen ilustrativa
ALTER TABLE servicios_catalogo
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
