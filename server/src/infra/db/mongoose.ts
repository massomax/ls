import mongoose from "mongoose";
import logger from "../../shared/logger";

export async function connectMongo(uri: string) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {});
  logger.info("Mongo connected");
}

export default { connectMongo };
