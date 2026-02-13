import { Button } from "@/components/ui/button";
import { MoveLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted shadow-[0_0_40px_-10px_rgba(122,0,60,0.3)]">
        <ShieldAlert className="h-10 w-10 text-primary" strokeWidth={1.5} />
      </div>

      <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        404
      </h1>

      <p className="mb-8 max-w-md text-lg text-muted-foreground">
        The page you are looking for doesn&apos;t exist or has been moved to a
        restricted area.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="default" size="lg" className="gap-2">
          <Link href="/">
            <MoveLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
