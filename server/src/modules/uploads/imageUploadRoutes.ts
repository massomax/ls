import { Router } from "express";
import multer from "multer";
import authenticateJwt from "../../shared/http/authenticateJwt";
import authorize from "../../shared/http/authorize";
import config from "../../shared/config";
import { BadRequestError } from "../../shared/errors/httpErrors";
import { uploadToImgur } from "../../infra/storage/imgurClient";

// Multer: храним в памяти, режем размер файла
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = config.uploads.allowedMime.includes(file.mimetype);
    if (ok) return cb(null, true); // принимает
    return cb(new Error("Unsupported file type")); // отклоняет с ошибкой
  },
});

const router = Router();

// Только seller/admin
router.post(
  "/images",
  authenticateJwt,
  authorize("seller", "admin"),
  upload.array("images", config.uploads.maxFiles),
  async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new BadRequestError("No files");

    // На всякий случай доп.валидация количества
    if (files.length > config.uploads.maxFiles) {
      throw new BadRequestError(
        `Too many files (max ${config.uploads.maxFiles})`
      );
    }

    // Загрузка по очереди (Imgur не любит параллель по одному токену)
    const results = [];
    for (const f of files) {
      const r = await uploadToImgur(f.buffer, f.mimetype);
      results.push({
        url: r.url,
        deleteHash: r.deleteHash ?? null,
        id: r.id ?? null,
        originalName: f.originalname,
        size: f.size,
        mime: f.mimetype,
      });
    }

    res.status(201).json({ items: results });
  }
);

export default router;
