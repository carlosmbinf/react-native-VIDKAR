export const SPOTLIGHT_DOMAINS = Object.freeze({
  courses: "com.vidkar.spotlight.courses.v1",
});

export const SPOTLIGHT_ITEM_TYPES = Object.freeze({
  course: "course",
});

const normalizeValue = (value) => String(value ?? "").trim();

const uniqueValues = (values) => Array.from(new Set(
  values.map(normalizeValue).filter(Boolean),
));

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

  return {
    id,
    title,
    domainIdentifier: SPOTLIGHT_DOMAINS.courses,
    description: normalizeValue(course?.descripcion) || "Curso de VIDKAR Academy",
    metadata: {
      contentType: "public.content",
      keywords: uniqueValues([
        "VIDKAR",
        "VIDKAR Academy",
        "curso",
        "cursos",
        title,
        course?.categoria,
        course?.nivel,
        professor,
        course?.profesorUsername ? `@${course.profesorUsername}` : null,
      ]),
      rankingHint: 0.8,
    },
  };
};

export const buildCourseSpotlightItems = (courses) => (
  Array.isArray(courses)
    ? courses.map(buildCourseSpotlightItem).filter(Boolean)
    : []
);

export const resolveSpotlightRoute = (itemId) => {
  const normalizedItemId = normalizeValue(itemId);
  const coursePrefix = `${SPOTLIGHT_ITEM_TYPES.course}:`;

  if (!normalizedItemId.startsWith(coursePrefix)) return null;

  const courseId = normalizedItemId.slice(coursePrefix.length).trim();
  if (!courseId) return null;

  return {
    pathname: "/(normal)/CursoDetalle",
    params: { courseId },
  };
};