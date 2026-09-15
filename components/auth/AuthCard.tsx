export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-xl border p-8 shadow-2xl backdrop-blur-xl"
        style={{
          background: "rgba(15, 10, 6, 0.82)",
          borderColor: "rgba(215, 164, 65, 0.35)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <h1 className="font-display mb-6 text-2xl font-semibold tracking-wide text-(--color-gold-bright) uppercase">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
