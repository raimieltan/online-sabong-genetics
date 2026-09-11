"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";

import { ChickenModel } from "@/components/chicken3d/ChickenModel";
import type { ThumbnailSubject } from "@/components/chicken3d/thumbnailCache";

export type ClinicScenePatient = {
  id: string;
  name: string;
  careLabel: string;
  careKind: "treatment" | "recovery" | "assessment";
  visual: ThumbnailSubject;
};

const BAY_POSITIONS: [number, number, number][] = [
  [-3.2, 0, 0.35],
  [0, 0, 0],
  [3.2, 0, 0.35],
];

function TreatmentBay({
  index,
  patient,
  selected,
  onSelect,
}: {
  index: number;
  patient?: ClinicScenePatient;
  selected: boolean;
  onSelect: () => void;
}) {
  const position = BAY_POSITIONS[index];
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.45, 0.35, 2.2]} />
        <meshStandardMaterial color={selected ? "#8b6930" : "#3b2a19"} roughness={0.8} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.38, 0]} receiveShadow>
        <boxGeometry args={[2.05, 0.12, 1.72]} />
        <meshStandardMaterial color={patient ? "#a69a78" : "#514735"} roughness={0.95} />
      </mesh>
      {[[-1.05, 0.75, -0.82], [1.05, 0.75, -0.82], [-1.05, 0.75, 0.82], [1.05, 0.75, 0.82]].map((p, leg) => (
        <mesh key={leg} position={p as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.85, 8]} />
          <meshStandardMaterial color="#9b7131" metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      {patient ? (
        <group position={[0, 0.52, 0.05]} scale={0.72} rotation={[0, index === 2 ? -0.28 : 0.2, 0]}>
          <ChickenModel {...patient.visual} animate={false} />
        </group>
      ) : (
        <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.42, 32]} />
          <meshBasicMaterial color="#75613e" transparent opacity={0.45} />
        </mesh>
      )}
      <Html position={[0, 2.35, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className="w-36 overflow-hidden border border-[#d7a44155] bg-[#0a0704e6] px-3 py-2 text-center shadow-xl backdrop-blur-md">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[#b98b3f]">{patient ? patient.careKind : `Bay ${index + 1}`}</p>
          <p className="mt-0.5 truncate font-serif text-xs font-semibold text-[#f1e4c2]">
            {patient?.name ?? "Available"}
          </p>
          {patient && <p className="mt-0.5 truncate text-[8px] uppercase tracking-wider text-[#a99a7a]" title={patient.careLabel}>{patient.careLabel}</p>}
        </div>
      </Html>
      {selected && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.42, 1.5, 48]} />
          <meshBasicMaterial color="#e1b65c" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

function ClinicEnvironment({ level }: { level: number }) {
  const upgraded = level >= 2;
  const advanced = level >= 3;
  return (
    <>
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[12.8, 0.18, 7.4]} />
        <meshStandardMaterial color={advanced ? "#403d35" : "#4a3522"} roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.35, -3.25]} receiveShadow>
        <boxGeometry args={[12.8, 4.8, 0.22]} />
        <meshStandardMaterial color={advanced ? "#626158" : "#5b4229"} roughness={0.92} />
      </mesh>
      {[-6.1, 6.1].map((x) => (
        <mesh key={x} position={[x, 2.05, 0]} receiveShadow>
          <boxGeometry args={[0.22, 4.3, 6.5]} />
          <meshStandardMaterial color={advanced ? "#56544d" : "#4a3422"} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 3.35, -3.08]}>
        <boxGeometry args={[4.1, 0.95, 0.16]} />
        <meshStandardMaterial color="#22170e" roughness={0.8} />
      </mesh>
      <Html position={[0, 3.38, -2.96]} center transform distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap font-serif text-sm font-bold uppercase tracking-[0.24em] text-[#e1b65c]">Rooster Clinic</div>
      </Html>
      <group position={[-5.1, 0.85, -2.55]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 1.7, 0.48]} />
          <meshStandardMaterial color={upgraded ? "#656158" : "#3f2818"} roughness={0.72} />
        </mesh>
        {[0.35, 0.8, 1.25].map((y) => (
          <mesh key={y} position={[0, y - 0.85, 0.27]}>
            <boxGeometry args={[1.05, 0.035, 0.04]} />
            <meshStandardMaterial color="#b98b3f" metalness={0.45} />
          </mesh>
        ))}
      </group>
      {upgraded && (
        <group position={[5.05, 0.72, -2.45]}>
          <mesh castShadow>
            <boxGeometry args={[1.45, 1.45, 0.72]} />
            <meshStandardMaterial color="#314148" metalness={0.25} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.12, 0.38]}>
            <planeGeometry args={[1.08, 0.72]} />
            <meshBasicMaterial color={advanced ? "#6ab6aa" : "#73929a"} />
          </mesh>
        </group>
      )}
      {advanced && [ -4.2, 4.2 ].map((x) => (
        <pointLight key={x} position={[x, 3.4, -0.6]} intensity={7} distance={6} color="#d7eff0" />
      ))}
    </>
  );
}

function Scene({ level, patients, selectedPatientId, onPatientSelect }: ClinicScene3DProps) {
  return (
    <>
      <color attach="background" args={["#15100b"]} />
      <fog attach="fog" args={["#241a11", 9, 22]} />
      <hemisphereLight args={["#f2d4a0", "#172019", 1.35]} />
      <directionalLight position={[-5, 9, 5]} intensity={2.5} color="#ffd79a" castShadow shadow-mapSize={[1024, 1024]} />
      <ClinicEnvironment level={level} />
      {BAY_POSITIONS.map((_, index) => (
        <TreatmentBay
          key={index}
          index={index}
          patient={patients[index]}
          selected={patients[index]?.id === selectedPatientId}
          onSelect={() => patients[index] && onPatientSelect?.(patients[index].id)}
        />
      ))}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.42} scale={14} blur={2.6} far={8} />
    </>
  );
}

type ClinicScene3DProps = {
  level: number;
  patients: ClinicScenePatient[];
  selectedPatientId?: string | null;
  onPatientSelect?: (id: string) => void;
};

export function ClinicScene3D(props: ClinicScene3DProps) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const preventPinch = (event: WheelEvent) => { if (event.ctrlKey) event.preventDefault(); };
    element.addEventListener("wheel", preventPinch, { passive: false });
    return () => element.removeEventListener("wheel", preventPinch);
  }, []);

  return (
    <div ref={container} className="h-[clamp(320px,42vw,520px)] w-full touch-none overflow-hidden bg-[#171009]">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 6.8, 10.8], fov: 42, near: 0.1, far: 50 }}>
        <Suspense fallback={null}><Scene {...props} /></Suspense>
      </Canvas>
    </div>
  );
}
