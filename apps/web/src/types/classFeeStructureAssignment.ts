import { ClassFeeStructureAssignment } from "../../api/services/classFeeStructureAssignmentService";

export interface ClassFeeStructureAssignmentTable extends ClassFeeStructureAssignment {}

export interface ClassFeeStructureAssignmentForm {
  academic_year: string;
  class_id: number | null;
  fee_structure_id: number | null;
  effective_date: string;
}
