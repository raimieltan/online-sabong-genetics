export type TrainingErrorCode =
  | "ROOSTER_TRAINING_NOT_FOUND"
  | "CHICKEN_NOT_FOUND"
  | "CHICKEN_NOT_OWNED"
  | "INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE"
  | "INVALID_REDISTRIBUTE_AMOUNT";

const STATUS_BY_CODE: Record<TrainingErrorCode, number> = {
  ROOSTER_TRAINING_NOT_FOUND: 404,
  CHICKEN_NOT_FOUND: 404,
  CHICKEN_NOT_OWNED: 404,
  INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE: 400,
  INVALID_REDISTRIBUTE_AMOUNT: 400,
};

export class TrainingError extends Error {
  code: TrainingErrorCode;
  status: number;

  constructor(code: TrainingErrorCode) {
    super(code);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
