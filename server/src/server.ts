import app from "./app";
import config from "./shared/config";
import logger from "./shared/logger";
import { connectMongo } from "./infra/db/mongoose";

import { startMetricsCron } from "./infra/cron/metricsCron";

async function main() {
  try {
    await connectMongo(config.mongoUri);
  } catch (err) {
    logger.error({ err }, "Mongo connection failed");
    process.exit(1);
  }

  startMetricsCron();

  const server = app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port}`);
  });

  process.on("SIGINT", () => server.close(() => process.exit(0)));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}

main();
export default main;
