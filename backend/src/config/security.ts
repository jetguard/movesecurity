export function jwtSecret() {
  return process.env.JWT_SECRET || "jetguard_dev_secret_change_me";
}

export function corsOrigin() {
  return process.env.CORS_ORIGIN || "*";
}

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

