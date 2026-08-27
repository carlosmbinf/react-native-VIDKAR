export const syncCourseSpotlightIndex = async (_items = []) => ({
  indexed: 0,
  supported: false,
});

export const syncUserSpotlightIndex = syncCourseSpotlightIndex;
export const syncMovieSpotlightIndex = syncCourseSpotlightIndex;

export const subscribeToSpotlightSelections = () => () => {};