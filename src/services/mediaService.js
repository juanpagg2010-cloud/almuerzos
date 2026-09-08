import crypto from "node:crypto";
import mongoose from "mongoose";
import appError from "../utils/appError.js";

const BUCKET_NAME = "menuImages";
const ALLOWED_IMAGES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const getBucket = () => {
  if (!mongoose.connection.db) throw appError("El almacenamiento de imágenes no está disponible.", 503);
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
};

const matchesSignature = (buffer, mimeType) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return false;
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
};

export const validateMenuImage = (file) => {
  const extension = ALLOWED_IMAGES[file?.mimetype];
  if (!extension || !matchesSignature(file.buffer, file.mimetype)) {
    throw appError("El archivo no es una imagen JPEG, PNG o WEBP válida.", 400);
  }
  return extension;
};

const uploadBuffer = (bucket, file, menuId) => new Promise((resolve, reject) => {
  const extension = validateMenuImage(file);
  const filename = `menu-${menuId}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const stream = bucket.openUploadStream(filename, {
    contentType: file.mimetype,
    metadata: { kind: "menu-image", menuId: String(menuId) },
  });

  stream.once("error", () => reject(appError("No se pudo guardar la imagen.", 500)));
  stream.once("finish", () => resolve(`/api/v1/media/menus/${stream.id}`));
  stream.end(file.buffer);
});

// GridFS persists inside the existing MongoDB database, unlike Render's local disk.
export const storeMenuImages = async (menuId, files) => {
  if (!files?.length) throw appError("Selecciona al menos una imagen.", 400);
  const bucket = getBucket();
  return Promise.all(files.map((file) => uploadBuffer(bucket, file, menuId)));
};

export const getMenuImageStream = async (imageId) => {
  if (!mongoose.Types.ObjectId.isValid(imageId)) throw appError("Imagen no encontrada.", 404);
  const bucket = getBucket();
  const objectId = new mongoose.Types.ObjectId(imageId);
  const file = await bucket.find({ _id: objectId, "metadata.kind": "menu-image" }).next();
  if (!file) throw appError("Imagen no encontrada.", 404);
  return { file, stream: bucket.openDownloadStream(objectId) };
};

const getIdFromUrl = (url) => {
  const match = String(url || "").match(/^\/api\/v1\/media\/menus\/([a-f\d]{24})$/i);
  return match?.[1] || null;
};

export const deleteStoredMenuImages = async (urls = []) => {
  const bucket = getBucket();
  await Promise.allSettled(urls.map(async (url) => {
    const id = getIdFromUrl(url);
    if (id) await bucket.delete(new mongoose.Types.ObjectId(id));
  }));
};

export default { deleteStoredMenuImages, getMenuImageStream, storeMenuImages, validateMenuImage };
