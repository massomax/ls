import pino from "pino";
import config from "../config";

const isDev = config.nodeEnv !== "production";

const logger = pino(
  isDev
    ? {
        transport: { target: "pino-pretty", options: { colorize: true } },
        level: "debug",
      }
    : { level: "info" }
);

export default logger;
