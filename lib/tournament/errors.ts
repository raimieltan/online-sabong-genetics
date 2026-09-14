export type TournamentErrorCode =
  | "CHICKEN_NOT_FOUND"
  | "CHICKEN_NOT_OWNED"
  | "CHICKEN_NOT_ELIGIBLE"
  | "TOURNAMENT_ALREADY_ACTIVE"
  | "TOURNAMENT_NOT_FOUND"
  | "TOURNAMENT_NOT_OWNED"
  | "TOURNAMENT_EVENT_INVALID"
  | "TOURNAMENT_FIGHT_INVALID"
  | "TOURNAMENT_COMPLETE";

const STATUS: Record<TournamentErrorCode, number> = {
  CHICKEN_NOT_FOUND: 404,
  CHICKEN_NOT_OWNED: 403,
  CHICKEN_NOT_ELIGIBLE: 400,
  TOURNAMENT_ALREADY_ACTIVE: 409,
  TOURNAMENT_NOT_FOUND: 404,
  TOURNAMENT_NOT_OWNED: 403,
  TOURNAMENT_EVENT_INVALID: 400,
  TOURNAMENT_FIGHT_INVALID: 400,
  TOURNAMENT_COMPLETE: 400,
};

export class TournamentError extends Error {
  code: TournamentErrorCode;
  status: number;
  constructor(code: TournamentErrorCode) {
    super(code);
    this.code = code;
    this.status = STATUS[code];
  }
}
