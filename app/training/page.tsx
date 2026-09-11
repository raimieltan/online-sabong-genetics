"use client";

import { Suspense } from "react";
import { TrainingGymShell } from "@/components/training/TrainingGymShell";

export default function TrainingPage() {
  return (
    <Suspense fallback={null}>
      <TrainingGymShell />
    </Suspense>
  );
}
