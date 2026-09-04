"use client";

import { useEffect, useRef } from "react";
import type { BattleLogEntry } from "@/lib/types";

interface BattleLogProps {
  entries: BattleLogEntry[];
}

export default function BattleLog({ entries }: BattleLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-96 overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-300 mb-3 uppercase tracking-wide sticky top-0 bg-gray-900 pb-2 border-b border-gray-700">
        Battle Log
      </h3>
      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-gray-500 text-sm italic text-center py-8">
            Waiting for battle to begin...
          </p>
        ) : (
          entries.map((entry, idx) => (
            <LogEntry key={idx} entry={entry} />
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

function LogEntry({ entry }: { entry: BattleLogEntry }) {
  const attackerColor = entry.attackerId.includes("red") || entry.attacker.includes(entry.attackerId.split("-")[0]) ? "text-red-400" : "text-blue-400";
  const defenderColor = entry.defenderId.includes("red") || entry.defender.includes(entry.defenderId.split("-")[0]) ? "text-red-400" : "text-blue-400";

  return (
    <div className="text-sm py-2 px-3 bg-gray-800 rounded border-l-2 border-gray-700">
      <div className="flex items-baseline gap-2">
        <span className="text-gray-500 font-mono text-xs min-w-[3rem]">
          T{entry.turn}
        </span>
        <div className="flex-1">
          <span className={`font-semibold ${attackerColor}`}>
            {entry.attacker}
          </span>
          <span className="text-gray-400 mx-1">→</span>
          <span className={`font-semibold ${defenderColor}`}>
            {entry.defender}
          </span>
          {entry.isMiss ? (
            <span className="text-yellow-400 ml-2 font-bold">MISS</span>
          ) : (
            <>
              <span className="text-gray-400 mx-1">—</span>
              <span
                className={`font-bold ${
                  entry.isCrit ? "text-orange-400" : "text-gray-300"
                }`}
              >
                {Math.floor(entry.damage)} DMG
                {entry.isCrit && (
                  <span className="ml-1 text-orange-500 uppercase text-xs">
                    CRIT!
                  </span>
                )}
              </span>
              {entry.isFatigueTriggered && (
                <span className="ml-2 text-purple-400 text-xs uppercase">
                  [FATIGUED]
                </span>
              )}
            </>
          )}
        </div>
        <span className="text-gray-500 text-xs tabular-nums">
          HP: {Math.max(0, Math.floor(entry.defenderHp))}
        </span>
      </div>
    </div>
  );
}
