import { useLocalSearchParams } from "expo-router";
import PeliculaDetalle from "../../components/downloadVideos/PeliculaDetalle.native";

export default function PeliculaDetalleScreen() {
  const { id } = useLocalSearchParams();
  const movieId = Array.isArray(id) ? id[0] : id;
  return <PeliculaDetalle movieId={movieId} />;
}
