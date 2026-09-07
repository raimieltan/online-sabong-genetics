export type PveErrorCode =
  | "BOSS_NOT_FOUND"
  | "BOSS_LOCKED"
  | "CHICKEN_NOT_FOUND"
  | "CHICKEN_NOT_OWNED"
  | "CHICKEN_NOT_ELIGIBLE"
  | "DEV_MODE_DISABLED"
  | "UNKNOWN_ACTION";

const STATUS_BY_CODE: Record<PveErrorCode, number> = {
  BOSS_NOT_FOUND: 404,
  BOSS_LOCKED: 403,
  CHICKEN_NOT_FOUND: 404,
  CHICKEN_NOT_OWNED: 404,
  CHICKEN_NOT_ELIGIBLE: 400,
  DEV_MODE_DISABLED: 403,
  UNKNOWN_ACTION: 400,
};

export class PveError extends Error {
  code: PveErrorCode;
  status: number;

  constructor(code: PveErrorCode) {
    super(code);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
