# API de almuerzos

Backend para que el administrador publique el menú diario y cada estudiante confirme desde su cuenta si asistirá al almuerzo.

## Roles

- `Admin`: publica, edita, cierra o elimina menús; además consulta las confirmaciones por menú.
- `Estudiante`: crea su propia cuenta, consulta menús publicados y confirma si asistirá o no.

El registro público siempre crea estudiantes. El administrador inicial se crea con `npm run seed`, evitando que alguien pueda registrarse como administrador desde el cliente.

## Instalación

```bash
npm install
Copy-Item .env.example .env
```

Completa `MONGO_URI`, `JWT_SECRET`, `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` en `.env`.

```bash
npm run seed
npm run dev
```

La API queda en `http://localhost:3000` y el health check es `GET /api/health`.

## Estructura

```txt
src/
  config/          Conexion de MongoDB
  controllers/     Respuestas HTTP
  middlewares/     JWT, roles, validaciones y errores
  models/          Usuario, Menu y confirmacion
  routes/          Endpoints de la API
  services/        Reglas de negocio
  app.js
  server.js
```

## Autenticación

Todas las rutas excepto registro e inicio de sesión requieren:

```txt
Authorization: Bearer TU_TOKEN
```

| Método | Ruta | Acceso | Función |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Público | Crea cuenta de estudiante |
| POST | `/api/v1/auth/login` | Público | Inicia sesión |
| GET | `/api/v1/auth/me` | Autenticado | Consulta la cuenta actual |

Ejemplo de registro:

```json
{
  "name": "Ana Torres",
  "email": "ana@colegio.edu",
  "password": "clave-segura"
}
```

## Menús

| Método | Ruta | Acceso | Función |
| --- | --- | --- | --- |
| GET | `/api/v1/menus` | Admin / Estudiante | Lista menús; el estudiante ve solo publicados |
| POST | `/api/v1/menus` | Admin | Crea el menú de una fecha |
| GET | `/api/v1/menus/:id` | Admin / Estudiante | Obtiene un menú |
| PATCH | `/api/v1/menus/:id` | Admin | Edita un menú |
| DELETE | `/api/v1/menus/:id` | Admin | Elimina un menú |

Ejemplo de menú:

```json
{
  "fecha": "2026-07-28",
  "platoPrincipal": "Pollo a la plancha",
  "acompanamiento": "Arroz y ensalada",
  "bebida": "Jugo de mango",
  "postre": "Gelatina",
  "descripcion": "Opcion vegetariana disponible en coordinación",
  "estado": "Publicado"
}
```

Solo puede existir un menú por fecha. Un menú `Cerrado` no se muestra a estudiantes ni acepta nuevas confirmaciones.

## Confirmaciones de asistencia

| Método | Ruta | Acceso | Función |
| --- | --- | --- | --- |
| PUT | `/api/v1/attendance/menus/:menuId` | Estudiante | Crea o actualiza su confirmación |
| GET | `/api/v1/attendance/me` | Estudiante | Consulta sus confirmaciones |
| GET | `/api/v1/attendance/menus/:menuId` | Admin | Ve las respuestas y el total de asistentes |

Ejemplo de confirmación:

```json
{
  "asistira": true,
  "observacion": "Sin cebolla, por favor"
}
```

Un estudiante solo puede tener una confirmación por menú; si vuelve a enviar la ruta, actualiza su respuesta.

## Pruebas

```bash
npm test
```

## Postman

Importa [Almuerzos.postman_collection.json](./postman/Almuerzos.postman_collection.json) en Postman. Antes de ejecutar las solicitudes, completa las variables `adminEmail` y `adminPassword` con las mismas credenciales usadas en `.env` para el seed.

Orden recomendado: inicia el servidor, ejecuta **Registrar estudiante** (solo la primera vez), **Login estudiante**, **Login administrador**, **Crear menu**, y después las confirmaciones. La colección guarda en automático `studentToken`, `adminToken` y `menuId`.
