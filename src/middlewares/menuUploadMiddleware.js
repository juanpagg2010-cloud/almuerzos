import multer from "multer";
import appError from "../utils/appError.js";

const upload = multer({
  // The buffer is immediately persisted in GridFS by the menu service. Writing
  // to Render's local filesystem would lose images after a deploy or restart.
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return callback(null, true);
    return callback(appError("Solo se permiten imágenes JPEG, PNG o WEBP.", 400));
  },
});

export const uploadMenuImages = upload.array("images", 5);
export default uploadMenuImages;
