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

## Probar localmente

Con MongoDB configurado en `.env`, ejecuta:

```bash
npm run dev
```

Despues abre `http://localhost:3000/api/health` o importa la coleccion de Postman. Para detener el servidor usa `Ctrl + C` en la terminal.

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

## Despliegue en Render

El archivo `render.yaml` ya configura el servicio web, la compilacion de Tailwind, `npm start` y el health check `/api/health`.

1. Sube el proyecto a GitHub sin incluir `.env`.
2. En Render selecciona **New > Blueprint** y conecta el repositorio.
3. Render detectara `render.yaml`. Antes de crear el servicio, define `MONGO_URI` con tu cadena de MongoDB Atlas. `JWT_SECRET` se genera automaticamente.
4. En MongoDB Atlas habilita la conexion desde Render en **Network Access**. Puedes usar temporalmente `0.0.0.0/0` para una API publica.
5. Al completar el despliegue, abre `https://TU-SERVICIO.onrender.com/api/health`.

El administrador debe existir previamente en la misma base de datos de Atlas. Crealo una vez con `npm run seed` usando ese mismo `MONGO_URI`.

> Las imagenes cargadas se guardan actualmente en `public/uploads`. En el plan gratuito de Render ese almacenamiento es temporal y se borra cuando el servicio se reinicia o se vuelve a desplegar. Para conservar imagenes debes usar Cloudinary, S3 u otro almacenamiento externo, o un disco persistente de Render (plan pagado).

## Postman

Importa [Almuerzos.postman_collection.json](./postman/Almuerzos.postman_collection.json) en Postman. Antes de ejecutar las solicitudes, completa las variables `adminEmail` y `adminPassword` con las mismas credenciales usadas en `.env` para el seed.

Orden recomendado: inicia el servidor, ejecuta **Registrar estudiante** (solo la primera vez), **Login estudiante**, **Login administrador**, **Crear menu**, y después las confirmaciones. La colección guarda en automático `studentToken`, `adminToken` y `menuId`.
