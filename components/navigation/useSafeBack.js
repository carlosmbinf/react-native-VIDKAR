import { useNavigation, useRouter } from "expo-router";
import React from "react";

export const useCanNavigateBack = () => {
  const navigation = useNavigation();
  return Boolean(navigation?.canGoBack?.());
};

const useSafeBack = (fallbackHref) => {
  const navigation = useNavigation();
  const router = useRouter();

  return React.useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    if (fallbackHref) {
      router.replace(fallbackHref);
    }
  }, [fallbackHref, navigation, router]);
};

export default useSafeBack;