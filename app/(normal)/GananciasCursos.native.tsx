import CourseEarnings from "../../components/courses/CourseEarnings.native";
import IosCoursesVisibilityGate from "../../components/courses/IosCoursesVisibilityGate";

export default function GananciasCursosRoute() {
  return (
    <IosCoursesVisibilityGate>
      <CourseEarnings />
    </IosCoursesVisibilityGate>
  );
}
