import pino from "pino";
import { environmentConfig } from "@/shared/config/env";

export const logger = pino({
  level: environmentConfig.NODE_ENV === "production" ? "info" : "debug",
  redact: ["password", "token", "authorization", "cookie"],
});
