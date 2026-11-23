import CourseDetail from "../../components/courses/CourseDetail";
import IosCoursesVisibilityGate from "../../components/courses/IosCoursesVisibilityGate";

export default function CursoDetalleRoute() {
  return (
    <IosCoursesVisibilityGate>
      <CourseDetail />
    </IosCoursesVisibilityGate>
  );
}