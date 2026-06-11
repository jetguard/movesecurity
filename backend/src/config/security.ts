export function jwtSecret() {
  return process.env.JWT_SECRET || "jetguard_dev_secret_change_me";
}

export function jwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || "15m";
}

export function corsOrigin() {
  return process.env.CORS_ORIGIN || "*";
}

export const loginPolicy = {
  maxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
  lockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
};

export const sessionPolicy = {
  idleMinutes: Number(process.env.SESSION_IDLE_MINUTES || 5),
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
};

export const uploadLimits = {
  fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE || 10 * 1024 * 1024),
};

export const tiposAnexoPermitidos = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
