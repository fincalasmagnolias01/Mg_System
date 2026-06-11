-- ============================================================
-- SYSTEM MG - BASE DE DATOS COMPLETA
-- PostgreSQL / Supabase
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE estado_cabana AS ENUM (
  'disponible', 'reservada', 'ocupada', 'limpieza', 'mantenimiento'
);

CREATE TYPE tipo_hospedaje AS ENUM ('noche', 'dia');

CREATE TYPE estado_reserva AS ENUM (
  'pendiente', 'confirmada', 'cancelada', 'completada'
);

CREATE TYPE estado_orden AS ENUM (
  'abierta', 'enviada_cocina', 'lista', 'pagada', 'cancelada'
);

CREATE TYPE estado_evento AS ENUM (
  'cotizacion', 'confirmado', 'en_curso', 'completado', 'cancelado'
);

CREATE TYPE forma_pago AS ENUM (
  'efectivo', 'tarjeta', 'transferencia', 'mixto'
);

CREATE TYPE tipo_movimiento_caja AS ENUM ('ingreso', 'egreso');

CREATE TYPE modulo_sistema AS ENUM ('restaurante', 'cabanas', 'eventos');

-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE roles (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre      VARCHAR(50)  NOT NULL UNIQUE,
  descripcion TEXT,
  permisos    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO roles (nombre, descripcion, permisos) VALUES
  ('admin',      'Administrador del sistema',     '{"all": true}'),
  ('recepcion',  'Recepción y cabañas',            '{"cabanas": true, "reportes": true}'),
  ('cajero',     'Cajero restaurante',             '{"restaurante": true, "caja": true}'),
  ('mesero',     'Toma de órdenes',                '{"restaurante": {"ordenes": true}}'),
  ('eventos',    'Coordinador de eventos',         '{"eventos": true}');

-- ============================================================
-- USUARIOS
-- ============================================================

CREATE TABLE usuarios (
  id         UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_id    UUID         UNIQUE, -- Supabase Auth UID
  nombre     VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  rol_id     UUID         REFERENCES roles(id),
  activo     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE clientes (
  id         UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre     VARCHAR(200) NOT NULL,
  telefono   VARCHAR(30),
  email      VARCHAR(255),
  nit        VARCHAR(30)  NOT NULL DEFAULT 'CF',
  direccion  TEXT,
  notas      TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cliente genérico para ventas rápidas
INSERT INTO clientes (nombre, nit) VALUES ('Consumidor Final', 'CF');

-- ============================================================
-- CATEGORÍAS
-- ============================================================

CREATE TABLE categorias (
  id         UUID            DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre     VARCHAR(100)    NOT NULL,
  modulo     modulo_sistema  NOT NULL,
  icono      VARCHAR(100),
  orden      INTEGER         NOT NULL DEFAULT 0,
  activo     BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Categorías Restaurante
INSERT INTO categorias (nombre, modulo, icono, orden) VALUES
  ('Bebidas Calientes', 'restaurante', '☕', 1),
  ('Gaseosas',          'restaurante', '🥤', 2),
  ('Cervezas',          'restaurante', '🍺', 3),
  ('Cubetazos',         'restaurante', '🪣', 4),
  ('Bebidas Deportivas','restaurante', '⚡', 5),
  ('Micheladas',        'restaurante', '🍹', 6),
  ('Jugos',             'restaurante', '🍊', 7),
  ('Licuados',          'restaurante', '🥛', 8),
  ('Minerales',         'restaurante', '💧', 9),
  ('Frescos',           'restaurante', '🌿', 10),
  ('Cócteles',          'restaurante', '🍸', 11),
  ('Whisky',            'restaurante', '🥃', 12),
  ('Vinos',             'restaurante', '🍷', 13),
  ('Desayunos',         'restaurante', '🍳', 14),
  ('Platos Fuertes',    'restaurante', '🍽️', 15),
  ('Postres',           'restaurante', '🍰', 16);

-- ============================================================
-- PRODUCTOS
-- ============================================================

CREATE TABLE productos (
  id              UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  categoria_id    UUID         REFERENCES categorias(id) ON DELETE SET NULL,
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  precio          DECIMAL(10,2) NOT NULL DEFAULT 0,
  tiene_variantes BOOLEAN       NOT NULL DEFAULT FALSE,
  variantes       JSONB         NOT NULL DEFAULT '[]',
  disponible      BOOLEAN       NOT NULL DEFAULT TRUE,
  orden           INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---- BEBIDAS CALIENTES ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Bebidas Calientes' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Chocolate', 15.00, 1),
  ('Café',      10.00, 2),
  ('Té',        10.00, 3),
  ('Café y Té', 10.00, 4)
) AS p(nombre, precio, ord);

-- ---- GASEOSAS ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Gaseosas' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Coca Cola',          15.00,  1),
  ('Pepsi',              15.00,  2),
  ('Naranjada con Soda', 15.00,  3),
  ('Grapette',           15.00,  4),
  ('Mirinda',            15.00,  5),
  ('Seven Up',           15.00,  6),
  ('Rica Piña',          15.00,  7),
  ('Té Frío',            15.00,  8),
  ('Tiki',               15.00,  9),
  ('Orange',             15.00, 10),
  ('Mineral Salutaris',  10.00, 11)
) AS p(nombre, precio, ord);

-- ---- CERVEZAS ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Cervezas' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Gallo',        20.00, 1),
  ('Corona',       30.00, 2),
  ('Modelo',       30.00, 3),
  ('Dorada Draft', 20.00, 4),
  ('Monte Carlo',  20.00, 5),
  ('Cabro',        20.00, 6),
  ('Stella',       35.00, 7),
  ('VIP',          35.00, 8)
) AS p(nombre, precio, ord);

-- ---- CUBETAZOS (6 cervezas) ----
INSERT INTO productos (nombre, precio, descripcion, categoria_id, orden)
SELECT p.nombre, p.precio, p.descripcion,
       (SELECT id FROM categorias WHERE nombre = 'Cubetazos' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Cubetazo Gallo',        100.00, '6 cervezas Gallo',        1),
  ('Cubetazo Corona',       150.00, '6 cervezas Corona',       2),
  ('Cubetazo Modelo',       150.00, '6 cervezas Modelo',       3),
  ('Cubetazo Dorada Draft', 100.00, '6 cervezas Dorada Draft', 4),
  ('Cubetazo Monte Carlo',  100.00, '6 cervezas Monte Carlo',  5),
  ('Cubetazo Cabro',        100.00, '6 cervezas Cabro',        6),
  ('Cubetazo Stella',       180.00, '6 cervezas Stella',       7),
  ('Cubetazo VIP',          180.00, '6 cervezas VIP',          8)
) AS p(nombre, precio, descripcion, ord);

-- ---- BEBIDAS DEPORTIVAS ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Bebidas Deportivas' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Gatorade', 20.00, 1)
) AS p(nombre, precio, ord);

-- ---- MICHELADAS (precio base = cerveza + jugo, calculado dinámicamente) ----
-- Las micheladas se calculan en la app: precio_cerveza + precio_jugo
INSERT INTO productos (nombre, precio, descripcion, tiene_variantes, variantes, categoria_id, orden)
SELECT p.nombre, p.precio, p.descripcion, TRUE,
       p.variantes::JSONB,
       (SELECT id FROM categorias WHERE nombre = 'Micheladas' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Michelada', 0.00, 'Seleccionar cerveza + jugo. Precio = cerveza + jugo',
   '[{"grupo": "cerveza", "opciones": ["Gallo", "Corona", "Modelo", "Dorada Draft", "Monte Carlo", "Cabro", "Stella", "VIP"]}, {"grupo": "jugo", "opciones": ["Naranja"]}]',
   1)
) AS p(nombre, precio, descripcion, variantes, ord);

-- ---- JUGOS ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Jugos' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Naranja', 10.00, 1)
) AS p(nombre, precio, ord);

-- ---- LICUADOS ----
INSERT INTO productos (nombre, precio, descripcion, tiene_variantes, variantes, categoria_id, orden)
SELECT p.nombre, p.precio, p.descripcion, TRUE,
       p.variantes::JSONB,
       (SELECT id FROM categorias WHERE nombre = 'Licuados' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Licuado con Agua',  25.00, 'Todas las frutas al mismo precio',
   '[{"grupo": "fruta", "opciones": ["Fresa", "Mango", "Papaya", "Melón", "Sandía", "Piña", "Banano"]}]', 1),
  ('Licuado con Leche', 30.00, 'Todas las frutas al mismo precio',
   '[{"grupo": "fruta", "opciones": ["Fresa", "Mango", "Papaya", "Melón", "Sandía", "Piña", "Banano"]}]', 2)
) AS p(nombre, precio, descripcion, variantes, ord);

-- ---- MINERALES ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Minerales' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Mineral Preparada', 15.00, 1),
  ('Cimarrona',         15.00, 2)
) AS p(nombre, precio, ord);

-- ---- FRESCOS ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Frescos' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Limonada', 15.00, 1),
  ('Jamaica',  15.00, 2),
  ('Naranja',  15.00, 3)
) AS p(nombre, precio, ord);

-- ---- CÓCTELES ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Cócteles' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Mojito',               50.00, 1),
  ('Vodka Orange',         45.00, 2),
  ('Quetzalteca Preparada',35.00, 3),
  ('Cuba Libre',           45.00, 4),
  ('Gin Tonic',            50.00, 5),
  ('Tequila Sunrise',      55.00, 6),
  ('Piña Colada',          55.00, 7)
) AS p(nombre, precio, ord);

-- ---- WHISKY ----
INSERT INTO productos (nombre, precio, tiene_variantes, variantes, categoria_id, orden)
SELECT p.nombre, p.precio, TRUE,
       p.variantes::JSONB,
       (SELECT id FROM categorias WHERE nombre = 'Whisky' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Johnnie Walker Black Label', 0.00,
   '[{"grupo": "presentacion", "opciones": [{"nombre": "Botella", "precio": 700}, {"nombre": "Trago", "precio": 60}]}]', 1),
  ('Johnnie Walker Red Label',   0.00,
   '[{"grupo": "presentacion", "opciones": [{"nombre": "Botella", "precio": 500}, {"nombre": "Trago", "precio": 45}]}]', 2),
  ('Old Parr',                   0.00,
   '[{"grupo": "presentacion", "opciones": [{"nombre": "Botella", "precio": 800}, {"nombre": "Trago", "precio": 70}]}]', 3),
  ('Buchanan''s',                0.00,
   '[{"grupo": "presentacion", "opciones": [{"nombre": "Botella", "precio": 750}, {"nombre": "Trago", "precio": 65}]}]', 4)
) AS p(nombre, precio, variantes, ord);

-- ---- VINOS ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Vinos' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Carmenere',         150.00, 1),
  ('Cabernet Sauvignon',150.00, 2),
  ('Black',             150.00, 3),
  ('Frontera',          120.00, 4)
) AS p(nombre, precio, ord);

-- ---- DESAYUNOS ----
INSERT INTO productos (nombre, precio, descripcion, categoria_id, orden)
SELECT p.nombre, p.precio, p.descripcion,
       (SELECT id FROM categorias WHERE nombre = 'Desayunos' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Chapín', 60.00,
   '2 huevos, frijol, tomate, plátano, crema, fruta, picante, 2 tortillas con queso mozzarella, café o jugo', 1),
  ('Típico Ganadero', 85.00,
   '2 huevos, tomate, cebolla, plátano, frijol, 4 oz lomito, picante, cebollín, 2 tortillas con queso mozzarella, café o jugo', 2),
  ('Sopa Magnolias', 75.00,
   'Gallina criolla, 2 huevos, cebolla, cilantro, 2 tortillas con queso mozzarella, café o jugo', 3),
  ('Tortillas al Queso', 80.00,
   '4 tortillas fundidas, queso mozzarella, 4 oz lomito, pico de gallo, guacamole, picante, cebollín, café o jugo', 4),
  ('Waffles', 55.00,
   '4 waffles, café o jugo', 5),
  ('Panqueques', 50.00,
   'Miel o chocolate, café o jugo', 6),
  ('Mexicano', 65.00,
   '2 huevos, tomate, cebolla, jalapeño, frijol, plátano, crema, 2 tortillas con queso mozzarella, café o jugo', 7),
  ('Ranchero', 60.00,
   '2 huevos, frijol, plátano, chirmol, 2 tortillas con queso mozzarella, picante, café o jugo', 8)
) AS p(nombre, precio, descripcion, ord);

-- ---- PLATOS FUERTES ----
INSERT INTO productos (nombre, precio, categoria_id, orden)
SELECT p.nombre, p.precio,
       (SELECT id FROM categorias WHERE nombre = 'Platos Fuertes' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Alitas BBQ (10 alitas)',    85.00,  1),
  ('Nachos con Carne Molida',   70.00,  2),
  ('Hamburguesa con Papas',     75.00,  3),
  ('Pasta Estilo Magnolias',    70.00,  4),
  ('Caldo de Gallina',          65.00,  5),
  ('Parrillada Especial',      200.00,  6),
  ('Tacos de Lomito',           75.00,  7),
  ('Tacos de Camarón',          80.00,  8),
  ('Lomito 4 oz',               70.00,  9),
  ('Lomito 8 oz',              120.00, 10),
  ('Camarones al Ajillo',       95.00, 11),
  ('Camarones Empanizados',     95.00, 12),
  ('Ceviche de Camarón',        85.00, 13),
  ('Aguachile de Camarón',      85.00, 14)
) AS p(nombre, precio, ord);

-- ---- POSTRES ----
INSERT INTO productos (nombre, precio, descripcion, tiene_variantes, variantes, categoria_id, orden)
SELECT p.nombre, p.precio, p.descripcion, p.tiene_variantes,
       p.variantes::JSONB,
       (SELECT id FROM categorias WHERE nombre = 'Postres' AND modulo = 'restaurante'),
       p.ord
FROM (VALUES
  ('Crepas Dulces', 45.00, 'Incluye helado',  TRUE,
   '[{"grupo": "sabor", "opciones": ["Nutella", "Hershey''s", "Arequipe"]}]', 1),
  ('Crepas Saladas', 50.00, 'Con queso mozzarella', TRUE,
   '[{"grupo": "relleno", "opciones": ["Pollo", "Salami"]}]', 2),
  ('Galleta de Cajeta', 40.00, 'Incluye helado', FALSE, '[]', 3)
) AS p(nombre, precio, descripcion, tiene_variantes, variantes, ord);

-- ============================================================
-- CABAÑAS
-- ============================================================

CREATE TABLE cabanas (
  id                     UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero                 INTEGER       NOT NULL UNIQUE,
  nombre                 VARCHAR(100)  NOT NULL,
  capacidad_max          INTEGER       NOT NULL DEFAULT 8,
  precio_adulto_noche    DECIMAL(10,2) NOT NULL DEFAULT 250.00,
  precio_nino_noche      DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  precio_dia_base        DECIMAL(10,2) NOT NULL DEFAULT 250.00,
  precio_dia_adicional   DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  estado                 estado_cabana NOT NULL DEFAULT 'disponible',
  notas                  TEXT,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO cabanas (numero, nombre) VALUES
  (1, 'Cabaña 1'),
  (2, 'Cabaña 2'),
  (3, 'Cabaña 3'),
  (4, 'Cabaña 4'),
  (5, 'Cabaña 5'),
  (6, 'Cabaña 6'),
  (7, 'Cabaña 7'),
  (8, 'Cabaña 8');

-- ============================================================
-- RESERVAS
-- ============================================================

CREATE TABLE reservas (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_reserva  BIGSERIAL     NOT NULL UNIQUE,
  cabana_id       UUID          NOT NULL REFERENCES cabanas(id),
  cliente_id      UUID          NOT NULL REFERENCES clientes(id),
  usuario_id      UUID          REFERENCES usuarios(id),
  tipo            tipo_hospedaje NOT NULL DEFAULT 'noche',
  fecha_entrada   TIMESTAMPTZ   NOT NULL,
  fecha_salida    TIMESTAMPTZ   NOT NULL,
  adultos         INTEGER       NOT NULL DEFAULT 0,
  ninos           INTEGER       NOT NULL DEFAULT 0, -- 3 a 8 años Q100
  bebes           INTEGER       NOT NULL DEFAULT 0, -- menores 3 años GRATIS
  precio_acordado DECIMAL(10,2),
  anticipo        DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado          estado_reserva NOT NULL DEFAULT 'pendiente',
  notas           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HOSPEDAJES
-- ============================================================

CREATE TABLE hospedajes (
  id             UUID           DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_hospedaje BIGSERIAL    NOT NULL UNIQUE,
  cabana_id      UUID           NOT NULL REFERENCES cabanas(id),
  reserva_id     UUID           REFERENCES reservas(id),
  cliente_id     UUID           NOT NULL REFERENCES clientes(id),
  usuario_id     UUID           REFERENCES usuarios(id),
  tipo           tipo_hospedaje NOT NULL DEFAULT 'noche',
  fecha_entrada  TIMESTAMPTZ    NOT NULL,
  fecha_salida   TIMESTAMPTZ,
  adultos        INTEGER        NOT NULL DEFAULT 0,
  ninos          INTEGER        NOT NULL DEFAULT 0,
  bebes          INTEGER        NOT NULL DEFAULT 0,
  precio_adulto  DECIMAL(10,2)  NOT NULL DEFAULT 250.00,
  precio_nino    DECIMAL(10,2)  NOT NULL DEFAULT 100.00,
  subtotal       DECIMAL(10,2)  NOT NULL DEFAULT 0,
  estado         VARCHAR(20)    NOT NULL DEFAULT 'activo', -- activo, checkout, cancelado
  notas          TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VAPEPASS
-- ============================================================

CREATE TABLE vapepass_tarifas (
  id           UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  horario      VARCHAR(50)   NOT NULL UNIQUE, -- '06:00-20:00', '18:00-22:00', '22:00-00:00'
  etiqueta     VARCHAR(100)  NOT NULL,
  hora_inicio  TIME          NOT NULL,
  hora_fin     TIME          NOT NULL,
  precio_adulto DECIMAL(10,2) NOT NULL,
  precio_nino   DECIMAL(10,2) NOT NULL,
  activo       BOOLEAN       NOT NULL DEFAULT TRUE
);

INSERT INTO vapepass_tarifas (horario, etiqueta, hora_inicio, hora_fin, precio_adulto, precio_nino) VALUES
  ('06:00-20:00', '6 AM – 8 PM',   '06:00', '20:00',  30.00,  30.00),
  ('18:00-22:00', '6 PM – 10 PM',  '18:00', '22:00',  50.00,  50.00),
  ('22:00-00:00', '10 PM – 12 AM', '22:00', '23:59', 100.00, 100.00);

CREATE TABLE vapepass (
  id             UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  tarifa_id      UUID          NOT NULL REFERENCES vapepass_tarifas(id),
  hospedaje_id   UUID          REFERENCES hospedajes(id),
  cabana_id      UUID          REFERENCES cabanas(id),
  cliente_id     UUID          REFERENCES clientes(id),
  usuario_id     UUID          REFERENCES usuarios(id),
  adultos        INTEGER       NOT NULL DEFAULT 0,
  ninos          INTEGER       NOT NULL DEFAULT 0,
  precio_adulto  DECIMAL(10,2) NOT NULL,
  precio_nino    DECIMAL(10,2) NOT NULL,
  total          DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÓRDENES RESTAURANTE
-- ============================================================

CREATE TABLE ordenes (
  id            UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_orden  BIGSERIAL     NOT NULL UNIQUE,
  mesa          VARCHAR(50),
  cliente_id    UUID          REFERENCES clientes(id),
  usuario_id    UUID          REFERENCES usuarios(id),
  estado        estado_orden  NOT NULL DEFAULT 'abierta',
  subtotal      DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento     DECIMAL(10,2) NOT NULL DEFAULT 0,
  propina       DECIMAL(10,2) NOT NULL DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  notas         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DETALLE ORDEN
-- ============================================================

CREATE TABLE detalle_orden (
  id               UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  orden_id         UUID          NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id      UUID          REFERENCES productos(id),
  nombre_producto  VARCHAR(200)  NOT NULL,
  cantidad         INTEGER       NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario  DECIMAL(10,2) NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  variante         JSONB         NOT NULL DEFAULT '{}',
  notas            TEXT,
  enviado_cocina   BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTOS
-- ============================================================

CREATE TABLE eventos (
  id               UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_evento    BIGSERIAL     NOT NULL UNIQUE,
  cliente_id       UUID          NOT NULL REFERENCES clientes(id),
  usuario_id       UUID          REFERENCES usuarios(id),
  nombre_evento    VARCHAR(200),
  fecha_evento     DATE          NOT NULL,
  hora_inicio      TIME,
  hora_fin         TIME,
  invitados        INTEGER       NOT NULL DEFAULT 0,
  lugar            TEXT,
  estado           estado_evento NOT NULL DEFAULT 'cotizacion',
  subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL DEFAULT 0,
  anticipo         DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_pendiente  DECIMAL(10,2) NOT NULL DEFAULT 0,
  observaciones    TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICIOS EVENTOS (CATÁLOGO)
-- ============================================================

CREATE TABLE servicios_catalogo (
  id          UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre      VARCHAR(200)  NOT NULL,
  descripcion TEXT,
  precio_base DECIMAL(10,2) NOT NULL DEFAULT 0,
  activo      BOOLEAN       NOT NULL DEFAULT TRUE,
  orden       INTEGER       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

INSERT INTO servicios_catalogo (nombre, precio_base, orden) VALUES
  ('Decoración Romántica', 500.00, 1),
  ('Sonido',               800.00, 2),
  ('Animación',            600.00, 3),
  ('Mobiliario',           400.00, 4),
  ('Exclusividad del Salón', 1000.00, 5),
  ('Cristalería',          300.00, 6),
  ('Cubertería',           200.00, 7);

-- ============================================================
-- SERVICIOS POR EVENTO
-- ============================================================

CREATE TABLE servicios_eventos (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  evento_id       UUID          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  catalogo_id     UUID          REFERENCES servicios_catalogo(id),
  nombre          VARCHAR(200)  NOT NULL,
  descripcion     TEXT,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  cantidad        INTEGER       NOT NULL DEFAULT 1,
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FACTURAS
-- ============================================================

CREATE TABLE facturas (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_factura  BIGSERIAL     NOT NULL UNIQUE,
  tipo            VARCHAR(50)   NOT NULL, -- 'restaurante','hospedaje','evento','vapepass'
  referencia_id   UUID,                   -- ID de orden, hospedaje o evento
  cliente_id      UUID          REFERENCES clientes(id),
  usuario_id      UUID          REFERENCES usuarios(id),
  nit             VARCHAR(30)   NOT NULL DEFAULT 'CF',
  nombre_factura  VARCHAR(200)  NOT NULL DEFAULT 'Consumidor Final',
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento       DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado          VARCHAR(20)   NOT NULL DEFAULT 'emitida', -- emitida, anulada
  anulada_por     UUID          REFERENCES usuarios(id),
  motivo_anulacion TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAGOS
-- ============================================================

CREATE TABLE pagos (
  id            UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  factura_id    UUID          NOT NULL REFERENCES facturas(id),
  forma_pago    forma_pago    NOT NULL,
  detalle_pago  JSONB         NOT NULL DEFAULT '{}',
  monto         DECIMAL(10,2) NOT NULL,
  cambio        DECIMAL(10,2) NOT NULL DEFAULT 0,
  referencia    VARCHAR(100),
  usuario_id    UUID          REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MOVIMIENTOS DE CAJA
-- ============================================================

CREATE TABLE movimientos_caja (
  id               UUID                    DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo             tipo_movimiento_caja    NOT NULL,
  concepto         VARCHAR(200)            NOT NULL,
  monto            DECIMAL(10,2)           NOT NULL,
  referencia_id    UUID,
  referencia_tipo  VARCHAR(50),
  usuario_id       UUID                    REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONFIGURACIÓN
-- ============================================================

CREATE TABLE configuracion (
  id          UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  clave       VARCHAR(100) NOT NULL UNIQUE,
  valor       TEXT,
  descripcion TEXT,
  tipo        VARCHAR(20)  NOT NULL DEFAULT 'texto', -- texto, numero, booleano, json
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO configuracion (clave, valor, descripcion, tipo) VALUES
  ('nombre_negocio',      'System Mg',     'Nombre del negocio',             'texto'),
  ('moneda',              'Q',             'Símbolo de moneda',              'texto'),
  ('checkin_hora',        '14:00',         'Hora de check-in cabañas',       'texto'),
  ('checkout_hora',       '12:00',         'Hora de check-out cabañas',      'texto'),
  ('propina_porcentaje',  '10',            'Porcentaje de propina restaurante', 'numero'),
  ('precio_adulto_cabaña','250',           'Precio adulto por noche cabañas','numero'),
  ('precio_nino_cabaña',  '100',           'Precio niño 3-8 años por noche', 'numero'),
  ('precio_dia_base',     '250',           'Precio cabaña por día (2 personas)', 'numero'),
  ('precio_dia_adicional','100',           'Precio persona adicional por día','numero'),
  ('impresora_termica',   'false',         'Impresora térmica habilitada',   'booleano'),
  ('impresora_ip',        '',              'IP de la impresora térmica',     'texto'),
  ('logo_url',            '',              'URL del logo del negocio',       'texto'),
  ('nit_empresa',         '',              'NIT de la empresa',              'texto'),
  ('direccion_empresa',   '',              'Dirección de la empresa',        'texto'),
  ('telefono_empresa',    '',              'Teléfono de la empresa',         'texto');

-- ============================================================
-- AUDITORÍA
-- ============================================================

CREATE TABLE auditoria (
  id               UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  tabla            VARCHAR(100) NOT NULL,
  operacion        VARCHAR(20)  NOT NULL, -- INSERT, UPDATE, DELETE
  registro_id      UUID,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  usuario_id       UUID         REFERENCES usuarios(id),
  ip               VARCHAR(50),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Usuarios
CREATE INDEX idx_usuarios_auth_id   ON usuarios(auth_id);
CREATE INDEX idx_usuarios_email     ON usuarios(email);
CREATE INDEX idx_usuarios_rol_id    ON usuarios(rol_id);

-- Productos
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_disponible ON productos(disponible);

-- Cabañas
CREATE INDEX idx_cabanas_estado      ON cabanas(estado);

-- Reservas
CREATE INDEX idx_reservas_cabana     ON reservas(cabana_id);
CREATE INDEX idx_reservas_cliente    ON reservas(cliente_id);
CREATE INDEX idx_reservas_estado     ON reservas(estado);
CREATE INDEX idx_reservas_fechas     ON reservas(fecha_entrada, fecha_salida);

-- Hospedajes
CREATE INDEX idx_hospedajes_cabana   ON hospedajes(cabana_id);
CREATE INDEX idx_hospedajes_cliente  ON hospedajes(cliente_id);
CREATE INDEX idx_hospedajes_estado   ON hospedajes(estado);
CREATE INDEX idx_hospedajes_fechas   ON hospedajes(fecha_entrada, fecha_salida);

-- Órdenes
CREATE INDEX idx_ordenes_estado      ON ordenes(estado);
CREATE INDEX idx_ordenes_usuario     ON ordenes(usuario_id);
CREATE INDEX idx_ordenes_created     ON ordenes(created_at DESC);

-- Detalle orden
CREATE INDEX idx_detalle_orden_orden ON detalle_orden(orden_id);

-- Eventos
CREATE INDEX idx_eventos_cliente     ON eventos(cliente_id);
CREATE INDEX idx_eventos_estado      ON eventos(estado);
CREATE INDEX idx_eventos_fecha       ON eventos(fecha_evento);

-- Facturas
CREATE INDEX idx_facturas_tipo       ON facturas(tipo);
CREATE INDEX idx_facturas_cliente    ON facturas(cliente_id);
CREATE INDEX idx_facturas_created    ON facturas(created_at DESC);

-- Movimientos caja
CREATE INDEX idx_movimientos_caja_created ON movimientos_caja(created_at DESC);

-- Auditoría
CREATE INDEX idx_auditoria_tabla     ON auditoria(tabla);
CREATE INDEX idx_auditoria_created   ON auditoria(created_at DESC);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cabanas_updated_at
  BEFORE UPDATE ON cabanas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reservas_updated_at
  BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_hospedajes_updated_at
  BEFORE UPDATE ON hospedajes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ordenes_updated_at
  BEFORE UPDATE ON ordenes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCIÓN: calcular total hospedaje
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_subtotal_hospedaje(
  p_adultos     INTEGER,
  p_ninos       INTEGER,
  p_precio_adulto DECIMAL,
  p_precio_nino   DECIMAL
)
RETURNS DECIMAL LANGUAGE plpgsql AS $$
BEGIN
  -- bebes (menores 3 años) no se cuentan, son gratis
  RETURN (p_adultos * p_precio_adulto) + (p_ninos * p_precio_nino);
END;
$$;

-- ============================================================
-- FUNCIÓN: calcular total vapepass
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_total_vapepass(
  p_adultos       INTEGER,
  p_ninos         INTEGER,
  p_precio_adulto DECIMAL,
  p_precio_nino   DECIMAL
)
RETURNS DECIMAL LANGUAGE plpgsql AS $$
BEGIN
  RETURN (p_adultos * p_precio_adulto) + (p_ninos * p_precio_nino);
END;
$$;

-- ============================================================
-- FUNCIÓN: calcular total orden
-- ============================================================

CREATE OR REPLACE FUNCTION recalcular_orden(p_orden_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_subtotal DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
    INTO v_subtotal
    FROM detalle_orden
   WHERE orden_id = p_orden_id;

  UPDATE ordenes
     SET subtotal = v_subtotal,
         total    = v_subtotal - descuento + propina
   WHERE id = p_orden_id;
END;
$$;

-- Trigger para recalcular orden al insertar/actualizar/eliminar detalle
CREATE OR REPLACE FUNCTION trg_recalcular_orden()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalcular_orden(OLD.orden_id);
  ELSE
    PERFORM recalcular_orden(NEW.orden_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_detalle_orden_totales
  AFTER INSERT OR UPDATE OR DELETE ON detalle_orden
  FOR EACH ROW EXECUTE FUNCTION trg_recalcular_orden();

-- ============================================================
-- FUNCIÓN: calcular total evento
-- ============================================================

CREATE OR REPLACE FUNCTION recalcular_evento(p_evento_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_subtotal DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
    INTO v_subtotal
    FROM servicios_eventos
   WHERE evento_id = p_evento_id;

  UPDATE eventos
     SET subtotal        = v_subtotal,
         total           = v_subtotal - descuento,
         saldo_pendiente = (v_subtotal - descuento) - anticipo
   WHERE id = p_evento_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_recalcular_evento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalcular_evento(OLD.evento_id);
  ELSE
    PERFORM recalcular_evento(NEW.evento_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_servicios_eventos_totales
  AFTER INSERT OR UPDATE OR DELETE ON servicios_eventos
  FOR EACH ROW EXECUTE FUNCTION trg_recalcular_evento();

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================

ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabanas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospedajes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vapepass_tarifas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vapepass           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_orden      ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_eventos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja   ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion      ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria          ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT r.nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
   WHERE u.auth_id = auth.uid()
   LIMIT 1;
$$;

-- Función helper para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
     WHERE u.auth_id = auth.uid()
       AND r.nombre = 'admin'
  );
$$;

-- Políticas: usuarios autenticados pueden leer datos operativos
-- y solo admins pueden modificar configuración

-- ROLES (solo lectura para todos los autenticados)
CREATE POLICY "roles_select" ON roles FOR SELECT TO authenticated USING (TRUE);

-- USUARIOS (cada quien ve el suyo, admin ve todos)
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT TO authenticated
  USING (auth_id = auth.uid() OR is_admin());
CREATE POLICY "usuarios_insert" ON usuarios FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY "usuarios_update" ON usuarios FOR UPDATE TO authenticated
  USING (auth_id = auth.uid() OR is_admin());

-- CLIENTES
CREATE POLICY "clientes_all" ON clientes FOR ALL TO authenticated USING (TRUE);

-- CATEGORÍAS
CREATE POLICY "categorias_select" ON categorias FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "categorias_write"  ON categorias FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- PRODUCTOS
CREATE POLICY "productos_select" ON productos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "productos_write"  ON productos FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- CABAÑAS
CREATE POLICY "cabanas_select" ON cabanas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "cabanas_update" ON cabanas FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "cabanas_write"  ON cabanas FOR INSERT TO authenticated WITH CHECK (is_admin());

-- RESERVAS
CREATE POLICY "reservas_all" ON reservas FOR ALL TO authenticated USING (TRUE);

-- HOSPEDAJES
CREATE POLICY "hospedajes_all" ON hospedajes FOR ALL TO authenticated USING (TRUE);

-- VAPEPASS
CREATE POLICY "vapepass_tarifas_select" ON vapepass_tarifas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "vapepass_tarifas_write"  ON vapepass_tarifas FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "vapepass_all"            ON vapepass FOR ALL TO authenticated USING (TRUE);

-- ÓRDENES
CREATE POLICY "ordenes_all"        ON ordenes       FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "detalle_orden_all"  ON detalle_orden FOR ALL TO authenticated USING (TRUE);

-- EVENTOS
CREATE POLICY "eventos_all"            ON eventos            FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "servicios_catalogo_sel" ON servicios_catalogo FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "servicios_catalogo_wrt" ON servicios_catalogo FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "servicios_eventos_all"  ON servicios_eventos  FOR ALL TO authenticated USING (TRUE);

-- FACTURAS Y PAGOS
CREATE POLICY "facturas_all" ON facturas FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "pagos_all"    ON pagos    FOR ALL TO authenticated USING (TRUE);

-- CAJA
CREATE POLICY "movimientos_caja_all" ON movimientos_caja FOR ALL TO authenticated USING (TRUE);

-- CONFIGURACIÓN
CREATE POLICY "config_select" ON configuracion FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "config_write"  ON configuracion FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- AUDITORÍA
CREATE POLICY "auditoria_select" ON auditoria FOR SELECT TO authenticated
  USING (is_admin());
CREATE POLICY "auditoria_insert" ON auditoria FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ============================================================
-- REALTIME (habilitar para tablas clave)
-- ============================================================

-- Ejecutar en Supabase Dashboard > Database > Replication
-- o con estos comandos:

ALTER PUBLICATION supabase_realtime ADD TABLE cabanas;
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes;
ALTER PUBLICATION supabase_realtime ADD TABLE detalle_orden;
ALTER PUBLICATION supabase_realtime ADD TABLE reservas;
ALTER PUBLICATION supabase_realtime ADD TABLE hospedajes;
ALTER PUBLICATION supabase_realtime ADD TABLE eventos;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
