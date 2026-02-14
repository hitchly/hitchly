import { AlertTriangle, ShieldAlert } from "lucide-react";

const EnvironmentBadge = () => {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-destructive/20 bg-destructive/5 text-destructive animate-pulse">
        <ShieldAlert className="h-3 w-3" />
        <span className="text-[10px] font-black uppercase tracking-tighter">
          Prod
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-600">
      <AlertTriangle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase tracking-tighter">
        Dev
      </span>
    </div>
  );
};

export default EnvironmentBadge;
