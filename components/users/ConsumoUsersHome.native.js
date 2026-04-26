import MeteorBase from "@meteorrn/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Appbar, List, Searchbar, Surface, Text } from "react-native-paper";

import useDeferredScreenData from "../../hooks/useDeferredScreenData";
import AppHeader from "../Header/AppHeader";
import UserAvatar from "./UserAvatar";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker }} */ (
    MeteorBase
  );

const BYTES_IN_MB_BINARY = 1048576;
const formatGB = (bytes) =>
  (Number(bytes || 0) / (BYTES_IN_MB_BINARY * 1024)).toFixed(2);

const ConsumoUsersHome = () => {
  const [search, setSearch] = useState("");
  const dataReady = useDeferredScreenData();

  const { loading, users } = Meteor.useTracker(() => {
    if (!dataReady) {
      return { loading: true, users: [] };
    }

    const username = Meteor.user()?.username;
    const userFilter =
      username === "carlosmbinf"
        ? { $or: [{ megasGastadosinBytes: { $gt: 0 } }, { baneado: false }] }
        : {
            $and: [
              {
                $or: [{ megasGastadosinBytes: { $gt: 0 } }, { baneado: false }],
              },
              {
                $or: [
                  { bloqueadoDesbloqueadoPor: Meteor.userId() },
                  { bloqueadoDesbloqueadoPor: { $exists: false } },
                  { bloqueadoDesbloqueadoPor: { $in: [""] } },
                ],
              },
            ],
          };
    const handle = Meteor.subscribe("user", userFilter, {
      fields: {
        username: 1,
        megasGastadosinBytes: 1,
        profile: 1,
        picture: 1,
        megas: 1,
        baneado: 1,
      },
    });
    return {
      loading: !handle.ready(),
      users: Meteor.users
        .find(userFilter, {
          sort: {
            megasGastadosinBytes: -1,
            "profile.firstName": 1,
            "profile.lastName": 1,
          },
          fields: {
            username: 1,
            megasGastadosinBytes: 1,
            profile: 1,
            picture: 1,
            megas: 1,
            baneado: 1,
          },
        })
        .fetch(),
    };
  }, [dataReady]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return users.filter((user) => {
      if (!user?.profile) {
        return false;
      }
      if (!term) {
        return true;
      }
      const username = user.username?.toLowerCase() || "";
      const firstName = user.profile?.firstName?.toLowerCase() || "";
      const lastName = user.profile?.lastName?.toLowerCase() || "";
      return (
        username.includes(term) ||
        firstName.includes(term) ||
        lastName.includes(term)
      );
    });
  }, [search, users]);

  return (
    <Surface style={styles.screen}>
      <AppHeader
        title="Consumo Proxy"
        subtitle="Usuarios con gasto o servicio activo"
        left={
          <Appbar.BackAction
            iconColor="#fff"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(normal)/Main")
            }
          />
        }
      />
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Buscar usuario"
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
        />
      </View>
      {loading ? (
        <View style={styles.loadingState}>
          <Text>Cargando consumo...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const consumidoGB = formatGB(item.megasGastadosinBytes || 0);
            const limiteGB = formatGB((item.megas || 0) * BYTES_IN_MB_BINARY);
            return (
              <Surface elevation={4} style={styles.itemCard}>
                <List.Item
                  onPress={() =>
                    router.push({
                      pathname: "/(normal)/User",
                      params: { item: item._id },
                    })
                  }
                  title={
                    `${item.profile?.firstName || ""} ${item.profile?.lastName || ""}`.trim() ||
                    item.username
                  }
                  description={`${item.username}\n${consumidoGB} GB consumidos${item.megas ? ` de ${limiteGB} GB` : ""}`}
                  left={() => (
                    <UserAvatar
                      user={item}
                      isConnected={item.baneado === false}
                      connectionType="proxy"
                      size={50}
                    />
                  )}
                  right={() => <List.Icon icon="chevron-right" />}
                />
              </Surface>
            );
          }}
        />
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FB" },
  filtersContainer: { padding: 16 },
  searchbar: { borderRadius: 16 },
  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  itemCard: { marginBottom: 10, borderRadius: 16, backgroundColor: "#ffffff" },
  loadingState: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default ConsumoUsersHome;
