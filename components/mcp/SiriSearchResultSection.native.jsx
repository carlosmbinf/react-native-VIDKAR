import React from "react";
import { FlatList, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";

import CoursesCatalog from "../courses/CoursesCatalog.native";
import DownloadVideosHome from "../downloadVideos/DownloadVideosHome.native";
import SeriesCatalog from "../series/SeriesCatalog.native";
import UsersHome from "../users/UsersHome.native";
import SiriSearchResultCard from "./SiriSearchResultCard.native";

export default function SiriSearchResultSection({ section, onOpen, onPlay }) {
  const { width } = useWindowDimensions();
  const ids = React.useMemo(() => section.results.map(({ id }) => id), [section.results]);
  let content;
  switch (section.type) {
    case "movie": content = <DownloadVideosHome searchResultIds={ids} />; break;
    case "series": content = <SeriesCatalog searchResultIds={ids} />; break;
    case "course": content = <CoursesCatalog searchResultIds={ids} />; break;
    case "user": content = <UsersHome searchResultIds={ids} />; break;
    default:
      content = <FlatList
        horizontal
        data={section.results}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        renderItem={({ item }) => (
          <View style={{ width: Math.min(360, width - 40) }}>
            <SiriSearchResultCard item={item} onOpen={onOpen} onPlay={onPlay} />
          </View>
        )}
      />;
  }
  return <View style={styles.section}>
    <Text variant="titleLarge">{section.title}</Text>
    {content}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 8, paddingBottom: 16 },
  rail: { gap: 12, paddingVertical: 8 },
});
