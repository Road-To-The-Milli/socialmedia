import { useState } from "react";
import { Loader2 } from "lucide-react";

type Provider = "google" | "apple";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.42.07 2.4.74 3.22.8.87-.07 1.76-.8 3.08-.76 1.66.14 2.96.85 3.78 2.2-3.44 2.07-2.88 6.74.58 8.2-.47 1.13-.96 2.22-2.66 2.44zM13 3.5c.2 1.94-1.64 3.5-3.5 3.43C9.19 4.86 11.04 3.18 13 3.5z" />
    </svg>
  );
}

interface OAuthButtonsProps {
  onOAuth: (provider: Provider) => Promise<void>;
  disabled?: boolean;
}

export function OAuthButtons({ onOAuth, disabled }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<Provider | null>(null);

  const handle = async (provider: Provider) => {
    setLoading(provider);
    try {
      await onOAuth(provider);
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="mt-5">
      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">ou continuer avec</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!!loading || disabled}
          onClick={() => handle("google")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-input/30 px-4 py-2.5 text-sm font-medium transition-all hover:bg-input/60 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading === "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Google
        </button>
        <button
          type="button"
          disabled={!!loading || disabled}
          onClick={() => handle("apple")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-input/30 px-4 py-2.5 text-sm font-medium transition-all hover:bg-input/60 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading === "apple" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <AppleIcon />
          )}
          Apple
        </button>
      </div>
    </div>
  );
}
