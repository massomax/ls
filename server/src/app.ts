import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import config from "./shared/config";
import { errorHandler, notFound } from "./shared/http/errorHandler";

import authRoutes from "./modules/auth/routes";
import userRoutes from "./modules/users/userRoutes";
import favoriteRoutes from "./modules/users/favoriteRoutes";
import sellerRoutes from "./modules/sellers/sellerRoutes";
import offerTypePublicRoutes from "./modules/offerTypes/publicRoutes";
import offerTypeAdminRoutes from "./modules/offerTypes/adminRoutes";
import categoryPublicRoutes from "./modules/categories/publicRoutes";
import categoryAdminRoutes from "./modules/categories/adminRoutes";
import subcategorySellerRoutes from "./modules/subcategories/sellerRoutes";
import subcategoryAdminRoutes from "./modules/subcategories/adminRoutes";
import productsPublicRoutes from "./modules/products/publicRoutes";
import sellerProductsRoutes from "./modules/products/sellerRoutes";
import imageUploadRoutes from "./modules/uploads/imageUploadRoutes";
import adminSellerRoutes from "./modules/sellers/adminRoutes";
import adminProductsRoutes from "./modules/products/adminRoutes";
import notificationUserRoutes from "./modules/notifications/userRoutes";
import swaggerRoutes from "./shared/docs/swagger";

const API_V1 = "/api/v1";

const app = express();

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (config.cors.origins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error("CORS blocked by server"));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.set("trust proxy", config.nodeEnv === "production" ? 1 : false);

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use(`${API_V1}/users`, userRoutes);
app.use(`${API_V1}/users/me/favorites`, favoriteRoutes);
app.use(`${API_V1}/auth`, authRoutes);
app.use(`${API_V1}/sellers`, sellerRoutes);

app.use(`${API_V1}/offer-types`, offerTypePublicRoutes);
app.use(`${API_V1}/offer-types`, offerTypeAdminRoutes);

app.use(`${API_V1}/categories`, categoryPublicRoutes);
app.use(`${API_V1}/admin/categories`, categoryAdminRoutes);
app.use(`${API_V1}/subcategories`, subcategorySellerRoutes);
app.use(`${API_V1}/admin/subcategories`, subcategoryAdminRoutes);

app.use(`${API_V1}/products`, productsPublicRoutes);
app.use(`${API_V1}/seller/products`, sellerProductsRoutes);

app.use(`${API_V1}/uploads`, imageUploadRoutes);
app.use(`${API_V1}/admin/sellers`, adminSellerRoutes);
app.use(`${API_V1}/admin/products`, adminProductsRoutes);
app.use(`${API_V1}/notifications`, notificationUserRoutes);

app.use(swaggerRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
