import type { Chicken, Player } from "@prisma/client";

export type PlayerDto = {
  id: string;
  displayName: string | null;
  credits: number;
  tournamentTokens: number;
};

export function toPlayerDto(player: Player): PlayerDto {
  return {
    id: player.id,
    displayName: player.displayName,
    credits: player.credits,
    tournamentTokens: player.tournamentTokens,
  };
}

export type ChickenDto = Omit<Chicken, "playerId">;

export function toChickenDto(chicken: Chicken): ChickenDto {
  const { playerId: _playerId, ...rest } = chicken;
  return rest;
}
