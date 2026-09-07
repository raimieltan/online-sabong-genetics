export type MedicalErrorCode =
  | "CLINIC_NOT_FOUND"
  | "CLINIC_NOT_OWNED"
  | "CLINIC_MAX_LEVEL"
  | "CHICKEN_NOT_FOUND"
  | "CHICKEN_NOT_OWNED"
  | "INJURY_NOT_FOUND"
  | "INJURY_ALREADY_IN_TREATMENT"
  | "SEVERITY_NOT_TREATABLE"
  | "NOTHING_TO_TREAT"
  | "INSUFFICIENT_CREDITS"
  | "TREATMENT_NOT_FOUND";

const STATUS_BY_CODE: Record<MedicalErrorCode, number> = {
  CLINIC_NOT_FOUND: 404,
  CLINIC_NOT_OWNED: 404,
  CLINIC_MAX_LEVEL: 400,
  CHICKEN_NOT_FOUND: 404,
  CHICKEN_NOT_OWNED: 404,
  INJURY_NOT_FOUND: 404,
  INJURY_ALREADY_IN_TREATMENT: 400,
  SEVERITY_NOT_TREATABLE: 400,
  NOTHING_TO_TREAT: 400,
  INSUFFICIENT_CREDITS: 400,
  TREATMENT_NOT_FOUND: 404,
};

export class MedicalError extends Error {
  code: MedicalErrorCode;
  status: number;

  constructor(code: MedicalErrorCode) {
    super(code);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
