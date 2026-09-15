export type SupabaseEnv = {
  url: string;
  publishableKey: string;
  appUrl: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  // Each process.env access below must stay a literal member expression
  // (not a dynamic process.env[name] lookup) so Next.js's bundler can
  // inline the NEXT_PUBLIC_ values into the browser bundle — a dynamic
  // lookup resolves to undefined client-side even when the var is set.
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    appUrl: required("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL),
  };
}
