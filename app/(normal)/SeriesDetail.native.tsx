import React from "react";
import { useLocalSearchParams } from "expo-router";
import SeriesDetail from "../../components/series/SeriesDetail.native";

export default function SeriesDetailScreen() {
  const { id, poster } = useLocalSearchParams();
  const serieId = Array.isArray(id) ? id[0] : id;
  const posterUri = Array.isArray(poster) ? poster[0] : poster;

  return <SeriesDetail idSerie={serieId} initialPosterUri={posterUri} />;
}
