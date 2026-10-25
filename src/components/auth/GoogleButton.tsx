"use client";

import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.86c2.26-2.08 3.56-5.15 3.56-8.65z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.3v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.16 7.16 0 0 1 4.87 12c0-.79.14-1.56.4-2.28V6.63H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.37l3.97-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.79l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.63l3.97 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

export function GoogleButton({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }) {
  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={onClick} disabled={isLoading}>
      <GoogleIcon />
      Continue with Google
    </Button>
  );
}
