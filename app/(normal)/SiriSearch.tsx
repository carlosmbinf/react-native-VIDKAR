import { Redirect, useLocalSearchParams } from "expo-router";

// Compatibilidad con enlaces y pushes anteriores, sin montar otra pantalla.
export default function LegacySiriSearch() {
	const params = useLocalSearchParams();
	return <Redirect href={{ pathname: "/siri-search", params }} />;
}
