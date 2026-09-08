import { Router } from "express";
import { getMenuImageStream } from "../services/mediaService.js";

const router = Router();

// Images need to be public because they are used directly in <img> elements.
// The ObjectId URL identifies immutable GridFS content and carries no user data.
router.get("/menus/:imageId", async (req, res, next) => {
  try {
    const { file, stream } = await getMenuImageStream(req.params.imageId);
    res.set({
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Length": String(file.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
    });
    stream.on("error", next);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
