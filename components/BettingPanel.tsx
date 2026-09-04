"use client";

import { useState, useEffect } from "react";
import type { Rooster, Bet } from "@/lib/types";
import { calculateOdds } from "@/lib/roosterGenerator";

interface BettingPanelProps {
  redRooster: Rooster | null;
  blueRooster: Rooster | null;
  credits: number;
  onBetPlaced: (bet: Bet) => void;
  disabled?: boolean;
}

export default function BettingPanel({
  redRooster,
  blueRooster,
  credits,
  onBetPlaced,
  disabled = false,
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState<string>("");
  const [selectedRooster, setSelectedRooster] = useState<"red" | "blue" | null>(
    null
  );

  const canPlaceBet =
    !disabled &&
    redRooster &&
    blueRooster &&
    selectedRooster &&
    betAmount &&
    parseInt(betAmount, 10) > 0 &&
    parseInt(betAmount, 10) <= credits;

  const odds =
    redRooster && blueRooster && selectedRooster
      ? selectedRooster === "red"
        ? calculateOdds(redRooster, blueRooster)
        : calculateOdds(blueRooster, redRooster)
      : 0;

  const potentialPayout =
    betAmount && odds ? Math.floor(parseInt(betAmount, 10) * odds) : 0;

  const handlePlaceBet = () => {
    if (!canPlaceBet || !selectedRooster || !redRooster || !blueRooster) return;

    const amount = parseInt(betAmount, 10);
    const chosenRooster = selectedRooster === "red" ? redRooster : blueRooster;

    onBetPlaced({
      amount,
      roosterId: chosenRooster.id,
      roosterName: chosenRooster.name,
      odds,
    });
  };

  useEffect(() => {
    if (disabled) {
      setBetAmount("");
      setSelectedRooster(null);
    }
  }, [disabled]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4 uppercase tracking-wide">
        Place Your Bet
      </h2>

      {/* Credits Display */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm uppercase tracking-wider">
            Available Credits
          </span>
          <span className="text-2xl font-bold text-green-400">
            {credits.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Rooster Selection */}
      {redRooster && blueRooster && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
            Choose Fighter
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedRooster("red")}
              disabled={disabled}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedRooster === "red"
                  ? "border-red-500 bg-red-900/30 shadow-lg"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="text-center">
                <div className="text-lg font-bold text-white mb-1">
                  {redRooster.name}
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  {redRooster.type}
                </div>
                {selectedRooster === "red" && (
                  <div className="text-sm font-semibold text-yellow-400">
                    Odds: {odds.toFixed(2)}x
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => setSelectedRooster("blue")}
              disabled={disabled}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedRooster === "blue"
                  ? "border-blue-500 bg-blue-900/30 shadow-lg"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="text-center">
                <div className="text-lg font-bold text-white mb-1">
                  {blueRooster.name}
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  {blueRooster.type}
                </div>
                {selectedRooster === "blue" && (
                  <div className="text-sm font-semibold text-yellow-400">
                    Odds: {odds.toFixed(2)}x
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Bet Amount Input */}
      <div className="mb-6">
        <label
          htmlFor="bet-amount"
          className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider"
        >
          Bet Amount
        </label>
        <input
          id="bet-amount"
          type="number"
          min="1"
          max={credits}
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          disabled={disabled}
          placeholder="Enter amount"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex gap-2 mt-2">
          {[100, 500, 1000, credits].map((amount) => (
            <button
              key={amount}
              onClick={() => setBetAmount(String(amount))}
              disabled={disabled || amount > credits}
              className="flex-1 py-2 px-3 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {amount === credits ? "MAX" : amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Potential Payout */}
      {selectedRooster && betAmount && parseInt(betAmount, 10) > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-700">
          <div className="flex justify-between items-center">
            <span className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">
              Potential Payout
            </span>
            <span className="text-2xl font-bold text-yellow-300">
              {potentialPayout.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Place Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={!canPlaceBet}
        className={`w-full py-4 px-6 font-bold rounded-lg uppercase tracking-wide text-lg transition-all duration-200 transform ${
          canPlaceBet
            ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 shadow-lg hover:scale-105"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
        }`}
      >
        {disabled
          ? "Battle in Progress"
          : !redRooster || !blueRooster
          ? "Select Both Roosters"
          : !selectedRooster
          ? "Choose a Fighter"
          : !betAmount || parseInt(betAmount, 10) <= 0
          ? "Enter Bet Amount"
          : parseInt(betAmount, 10) > credits
          ? "Insufficient Credits"
          : "Place Bet & Start Battle"}
      </button>
    </div>
  );
}
