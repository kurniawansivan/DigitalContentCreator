import { ErrorCode, HTTP_STATUS_SERVICE_UNAVAILABLE } from "@/shared/errors/errorCode";
import { buildErrorResponse, buildSuccessResponse, type FieldError } from "@/shared/http/envelope";
import { generateRequestId, toErrorResponse } from "@/shared/http/errorHandler";
import { buildJsonResponse } from "@/shared/http/jsonResponse";
import type { HealthService } from "@/modules/health/health.service";
import type { HealthStatus } from "@/modules/health/health.types";

function buildUnavailableDependencyErrors(status: HealthStatus): FieldError[] {
  const errors: FieldError[] = [];
  if (status.database === "down") {
    errors.push({
      field: null,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: "Database is unreachable",
    });
  }
  if (status.queue === "down") {
    errors.push({
      field: null,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: "Queue is unreachable",
    });
  }
  return errors;
}

export async function handleGetHealth(healthService: HealthService): Promise<Response> {
  const requestId = generateRequestId();

  try {
    const status = await healthService.getHealthStatus();
    const isHealthy = status.database === "up" && status.queue === "up";

    const body = isHealthy
      ? buildSuccessResponse({ data: status, message: "Service is healthy", requestId })
      : buildErrorResponse({
          statusCode: HTTP_STATUS_SERVICE_UNAVAILABLE,
          message: "Service is degraded",
          errors: buildUnavailableDependencyErrors(status),
          requestId,
        });

    return buildJsonResponse(body, requestId);
  } catch (error) {
    const { body } = toErrorResponse(error, requestId);
    return buildJsonResponse(body, requestId);
  }
}
