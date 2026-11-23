import CoursesCatalog from "../../components/courses/CoursesCatalog.native";
import IosCoursesVisibilityGate from "../../components/courses/IosCoursesVisibilityGate";

export default function CursosRoute() {
  return (
    <IosCoursesVisibilityGate>
      <CoursesCatalog />
    </IosCoursesVisibilityGate>
  );
}