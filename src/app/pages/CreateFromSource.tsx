import { CourseCreationFlow } from "./CreateCourse";

/**
 * Source-based creation: same unified flow, source type pre-selected
 * so the user lands on the type step with "По источнику" already active.
 */
export default function CreateFromSource() {
  return <CourseCreationFlow initialType="source" />;
}
