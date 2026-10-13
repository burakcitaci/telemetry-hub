import { useAuth } from "@/features/auth/auth-context";
import { InfrastructureDashboard } from "./infrastructure-dashboard";
import { useInfrastructure } from "./use-infrastructure";
import "./infrastructure.css";

export default function InfrastructurePage() {
  const { session } = useAuth();
  const allowed = session?.role === "admin";
  const state = useInfrastructure(allowed);
  if (!allowed)
    return (
      <p role="alert" className="p-2 text-sm text-muted-foreground">
        Infrastructure is a cluster-wide operator view. Administrator access
        required.
      </p>
    );
  return <InfrastructureDashboard {...state} />;
}
