import { HealthRepository } from "@/modules/health/health.repository";
import { HealthService } from "@/modules/health/health.service";
import { RedisConnectionChecker } from "@/modules/health/health.redisConnectionChecker";

export function createHealthService(): HealthService {
  return new HealthService(new HealthRepository(), new RedisConnectionChecker());
}
