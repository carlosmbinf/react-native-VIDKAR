export const SPOTLIGHT_DOMAINS = Object.freeze({
  courses: "com.vidkar.spotlight.courses.v1",
  users: "com.vidkar.spotlight.users.v1",
  movies: "com.vidkar.spotlight.movies.v1",
});

export const SPOTLIGHT_ITEM_TYPES = Object.freeze({
  course: "course",
  user: "user",
  movie: "movie",
});

const normalizeValue = (value) => String(value ?? "").trim();

const uniqueValues = (values) => Array.from(new Set(
  values.map(normalizeValue).filter(Boolean),
));

const normalizeUrl = (value) => {
  const normalizedValue = normalizeValue(value);
  return /^https?:\/\//i.test(normalizedValue) ? normalizedValue : null;
};

const buildItem = ({ domainIdentifier, description, id, keywords, title, thumbnailURL }) => {
  if (!id || !title) return null;

  return {
    id,
    title,
    domainIdentifier,
    description,
    thumbnailURL,
    metadata: {
      contentType: "public.content",
      keywords: uniqueValues(keywords),
      rankingHint: 0.8,
    },
  };
};

export const buildCourseSpotlightId = (courseId) => {
  const normalizedCourseId = normalizeValue(courseId);
  return normalizedCourseId
    ? `${SPOTLIGHT_ITEM_TYPES.course}:${normalizedCourseId}`
    : null;
};

export const buildCourseSpotlightItem = (course) => {
  const id = buildCourseSpotlightId(course?._id);
  const title = normalizeValue(course?.titulo);

  if (!id || !title) return null;

  const professor = normalizeValue(
    course?.profesorNombre || course?.profesorUsername,
  );

  return buildItem({
    id,
    title,
    domainIdentifier: SPOTLIGHT_DOMAINS.courses,
    description: normalizeValue(course?.descripcion) || "Curso de VIDKAR Academy",
    thumbnailURL: normalizeUrl(course?.portadaUrl),
    keywords: [
      "VIDKAR", "VIDKAR Academy", "curso", "cursos", title,
      course?.categoria, course?.nivel, professor,
      course?.profesorUsername ? `@${course.profesorUsername}` : null,
    ],
  });
};

export const buildCourseSpotlightItems = (courses) => (
  Array.isArray(courses)
    ? courses.map(buildCourseSpotlightItem).filter(Boolean)
    : []
);

export const buildUserSpotlightId = (userId) => {
  const normalizedUserId = normalizeValue(userId);
  return normalizedUserId ? `${SPOTLIGHT_ITEM_TYPES.user}:${normalizedUserId}` : null;
};

export const buildUserSpotlightItem = (user) => {
  const id = buildUserSpotlightId(user?._id);
  const username = normalizeValue(user?.username);
  const fullName = normalizeValue(
    `${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}`,
  );
  const title = fullName || username;

  return buildItem({
    id,
    title,
    domainIdentifier: SPOTLIGHT_DOMAINS.users,
    description: username ? `@${username}` : "Usuario de VIDKAR",
    thumbnailURL: normalizeUrl(user?.picture || user?.profile?.picture || user?.profile?.avatar),
    keywords: ["VIDKAR", "usuario", username, fullName, user?.profile?.role],
  });
};

export const buildUserSpotlightItems = (users) => (
  Array.isArray(users) ? users.map(buildUserSpotlightItem).filter(Boolean) : []
);

export const buildMovieSpotlightId = (movieId) => {
  const normalizedMovieId = normalizeValue(movieId);
  return normalizedMovieId ? `${SPOTLIGHT_ITEM_TYPES.movie}:${normalizedMovieId}` : null;
};

export const buildMovieSpotlightItem = (movie) => {
  const id = buildMovieSpotlightId(movie?._id);
  const title = normalizeValue(movie?.nombrePeli);
  const genres = Array.isArray(movie?.clasificacion)
    ? movie.clasificacion
    : [movie?.clasificacion];

  return buildItem({
    id,
    title,
    domainIdentifier: SPOTLIGHT_DOMAINS.movies,
    description: normalizeValue(movie?.descripcion) || "Película disponible en VIDKAR",
    thumbnailURL: normalizeUrl(movie?.thumbnailURL || movie?.urlBackgroundHTTPS || movie?.urlBackground),
    keywords: ["VIDKAR", "película", "películas", title, movie?.year, ...genres, movie?.actors],
  });
};

export const buildMovieSpotlightItems = (movies) => (
  Array.isArray(movies) ? movies.map(buildMovieSpotlightItem).filter(Boolean) : []
);

export const resolveSpotlightRoute = (itemId) => {
  const normalizedItemId = normalizeValue(itemId);
  const routeDefinitions = [
    [SPOTLIGHT_ITEM_TYPES.course, "/(normal)/CursoDetalle", "courseId"],
    [SPOTLIGHT_ITEM_TYPES.user, "/(normal)/User", "item"],
    [SPOTLIGHT_ITEM_TYPES.movie, "/(normal)/PeliculaPlayer", "id"],
  ];

  const definition = routeDefinitions.find(([type]) => (
    normalizedItemId.startsWith(`${type}:`)
  ));
  if (!definition) return null;

  const [, pathname, parameter] = definition;
  const entityId = normalizedItemId.slice(String(definition[0]).length + 1).trim();
  if (!entityId) return null;

  return {
    pathname,
    params: { [parameter]: entityId },
  };
};