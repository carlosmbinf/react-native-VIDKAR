export const syncCourseSpotlightIndex = async () => ({
  indexed: 0,
  supported: false,
});

export const syncUserSpotlightIndex = syncCourseSpotlightIndex;
export const syncMovieSpotlightIndex = syncCourseSpotlightIndex;

export const subscribeToSpotlightSelections = () => () => {};