-- ============================================================
-- SYSTEM MG - CREAR USUARIO ADMIN
-- Ejecutar en Supabase SQL Editor (con permisos de admin)
-- Login: admin / admin123
-- ============================================================

DO $$
DECLARE
  uid_admin  UUID := gen_random_uuid();
  rol_admin  UUID;
BEGIN

  SELECT id INTO rol_admin FROM roles WHERE nombre = 'admin';

  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at, recovery_sent_at,
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', uid_admin,
    'authenticated', 'authenticated',
    'admin@systemmg.local',
    crypt('admin123', gen_salt('bf')),
    now(), null, now(),
    '{"provider":"email","providers":["email"]}', '{"nombre":"Administrador"}',
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), uid_admin,
    'admin@systemmg.local', 'email',
    format('{"sub":"%s","email":"admin@systemmg.local"}', uid_admin)::jsonb,
    now(), now(), now()
  );

  INSERT INTO usuarios (auth_id, nombre, email, rol_id, activo) VALUES
  (uid_admin, 'Administrador', 'admin@systemmg.local', rol_admin, TRUE);

END $$;

-- Verificar
SELECT u.nombre, replace(u.email, '@systemmg.local', '') AS usuario_login, r.nombre AS rol
FROM usuarios u
LEFT JOIN roles r ON r.id = u.rol_id;
