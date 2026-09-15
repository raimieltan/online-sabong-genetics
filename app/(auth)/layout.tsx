export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-(--background) text-(--foreground)">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url(/background/home-backround.png)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
