-- ======================================================
-- MGSystem — Configuración de Storage en Supabase
-- Ejecuta este script en Supabase → SQL Editor → Run
-- ======================================================

-- 1. Crear (o actualizar) los buckets como PÚBLICOS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('productos',  'productos',  true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']),
  ('cabanas',    'cabanas',    true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']),
  ('categorias', 'categorias', true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']),
  ('eventos',    'eventos',    true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']),
  ('servicios',  'servicios',  true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif'];

-- 2. Crear políticas RLS para cada bucket
DO $$
DECLARE
  buckets TEXT[] := ARRAY['productos','cabanas','categorias','eventos','servicios'];
  b TEXT;
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    -- Eliminar políticas anteriores si existen
    EXECUTE format('DROP POLICY IF EXISTS "mgs_read_%s"   ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "mgs_insert_%s" ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "mgs_update_%s" ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "mgs_delete_%s" ON storage.objects', b);

    -- Lectura pública (cualquiera puede ver las imágenes)
    EXECUTE format(
      'CREATE POLICY "mgs_read_%s" ON storage.objects FOR SELECT USING (bucket_id = %L)',
      b, b
    );
    -- Subida para usuarios autenticados
    EXECUTE format(
      'CREATE POLICY "mgs_insert_%s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
      b, b
    );
    -- Actualización para usuarios autenticados
    EXECUTE format(
      'CREATE POLICY "mgs_update_%s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L)',
      b, b
    );
    -- Eliminación para usuarios autenticados
    EXECUTE format(
      'CREATE POLICY "mgs_delete_%s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)',
      b, b
    );
  END LOOP;
END $$;

-- Verificar resultado
SELECT id, name, public, file_size_limit FROM storage.buckets
WHERE id IN ('productos','cabanas','categorias','eventos','servicios')
ORDER BY id;
