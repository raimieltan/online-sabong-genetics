export type SupabaseEnv = {
  url: string;
  publishableKey: string;
  appUrl: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    appUrl: required("NEXT_PUBLIC_APP_URL"),
  };
}
