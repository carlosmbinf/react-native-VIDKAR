import CoursesManagement from "../../components/courses/CoursesManagement.native";
import IosCoursesVisibilityGate from "../../components/courses/IosCoursesVisibilityGate";

export default function GestionCursosRoute() {
  return (
    <IosCoursesVisibilityGate>
      <CoursesManagement />
    </IosCoursesVisibilityGate>
  );
}