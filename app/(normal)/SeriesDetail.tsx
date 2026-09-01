import React from "react";
import { useLocalSearchParams } from "expo-router";
import SeriesDetail from "../../components/series/SeriesDetail.native";

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams();
  const serieId = Array.isArray(id) ? id[0] : id;

  return <SeriesDetail idSerie={serieId} />;
}
