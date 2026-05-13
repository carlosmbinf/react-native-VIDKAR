export const DEFAULT_HLS_REFRESH_INTERVAL_MS = 5000;

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.values(value);
};

export const normalizeHlsRuntimeSnapshot = (snapshot = {}) => {
  const runtime = snapshot.runtime || snapshot;
  const hlsJobs = toArray(
    runtime.activeFfmpegJobs
      || runtime.hlsJobs
      || runtime.jobs
      || runtime.conversions
      || runtime.activeHlsJobs,
  );
  const directStreams = toArray(
    runtime.directStreams || runtime.streams || runtime.activeDirectStreams,
  );
  const totals = runtime.totals || snapshot.totals || {};

  return {
    cacheDir: runtime.cacheDir || snapshot.cacheDir || null,
    capturedAt: runtime.now || runtime.capturedAt || runtime.updatedAt || snapshot.capturedAt || new Date().toISOString(),
    ffmpegPath: runtime.ffmpegPath || snapshot.ffmpegPath || null,
    hlsJobs: hlsJobs.map(normalizeHlsJob),
    directStreams: directStreams.map(normalizeDirectStream),
    totals: {
      activeHlsJobs: numberOrFallback(totals.activeHlsJobs, hlsJobs.length),
      activeDirectStreams: numberOrFallback(totals.activeDirectStreams, directStreams.length),
      activeStreams: numberOrFallback(
        totals.activeStreams,
        hlsJobs.length + directStreams.length,
      ),
      totalSessions: numberOrFallback(
        totals.totalSessions,
        hlsJobs.length + directStreams.length,
      ),
      ffmpegProcesses: numberOrFallback(totals.ffmpegProcesses, hlsJobs.length),
    },
  };
};

const numberOrFallback = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeHlsJob = (job = {}, index = 0) => {
  const progress = job.progress || {};
  const movie = job.movie || job.pelicula || {};
  const percent = numberOrFallback(
    progress.percent ?? progress.percentage ?? job.percent ?? job.progressPercent,
    0,
  );

  return {
    id: String(job.id || job.sessionId || job.jobKey || `hls-${index}`),
    movieTitle: movie.nombre || movie.title || job.movieTitle || job.nombre || "Pelicula en conversion",
    sessionId: job.sessionId || job.id || "Sin sesion",
    status: job.status || job.state || "processing",
    pid: job.pid || job.processId || null,
    percent: Math.max(0, Math.min(100, percent)),
    fps: progress.fps || job.fps || null,
    speed: progress.speed || job.speed || null,
    time: progress.out_time || progress.time || job.time || null,
    segments: numberOrFallback(job.segmentsCount ?? job.segments ?? job.segmentCount ?? progress.segments, 0),
    startedAt: job.startedAt || job.createdAt || null,
    updatedAt: job.updatedAt || job.lastActivityAt || null,
    lastLines: toArray(job.recentOutput || job.lastLines || job.ffmpegTail || job.logs).slice(-5),
  };
};

const normalizeDirectStream = (stream = {}, index = 0) => {
  const movie = stream.movie || stream.pelicula || {};

  return {
    id: String(stream.id || stream.streamId || stream.sessionId || `stream-${index}`),
    movieTitle: movie.nombre || movie.title || stream.movieTitle || stream.nombre || "Stream directo",
    range: stream.range || stream.httpRange || "Completo",
    ip: stream.ip || stream.remoteAddress || stream.clientIp || "Sin IP",
    userAgent: stream.userAgent || stream.ua || "Cliente no identificado",
    videoUrl: stream.videoUrl || stream.url || null,
    startedAt: stream.startedAt || stream.createdAt || null,
    updatedAt: stream.updatedAt || stream.lastActivityAt || null,
    bytesSent: numberOrFallback(stream.bytesSent || stream.sentBytes, 0),
  };
};

export const formatRuntimeDate = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
};

export const formatRuntimeDuration = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  const elapsedMs = Date.now() - date.getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return "-";

  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return "Hace menos de 1 min";
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
};

export const formatBytes = (bytes) => {
  const numericBytes = Number(bytes);
  if (!Number.isFinite(numericBytes) || numericBytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(numericBytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = numericBytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export const getHlsStatusMeta = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (["ready", "running", "processing", "active"].includes(normalizedStatus)) {
    return { color: "#22c55e", label: "Activo" };
  }

  if (["starting", "queued", "idle"].includes(normalizedStatus)) {
    return { color: "#f59e0b", label: "Preparando" };
  }

  if (["error", "failed", "stopped"].includes(normalizedStatus)) {
    return { color: "#ef4444", label: "Revisar" };
  }

  return { color: "#38bdf8", label: status || "En proceso" };
};
