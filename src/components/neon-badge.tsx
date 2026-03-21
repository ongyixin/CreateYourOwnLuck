import { cn } from "@/lib/utils";

interface NeonBadgeProps {
  children: React.ReactNode;
  variant?: "green" | "pink" | "amber" | "cyan" | "purple" | "red" | "blue";
}

const styles: Record<string, string> = {
  green: "border-neon-green text-neon-green",
  pink: "border-neon-pink text-neon-pink",
  amber: "border-neon-amber text-neon-amber",
  cyan: "border-neon-cyan text-neon-cyan",
  purple: "border-neon-purple text-neon-purple",
  red: "text-neon-red border-neon-pink",
  blue: "text-neon-blue border-neon-blue",
};

export default function NeonBadge({ children, variant = "green" }: NeonBadgeProps) {
  return (
    <span className={cn("neon-badge", styles[variant])}>{children}</span>
  );
}
