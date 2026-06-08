import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
}

export default function Alert({
  children,
  variant = "info",
  title,
  className,
  ...props
}: AlertProps) {
  const styles = {
    success: {
      container: "bg-green-50 border-green-200 text-green-800",
      icon: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
    },
    error: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
    },
    warning: {
      container: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />,
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    },
  };

  const { container, icon } = styles[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        container,
        className
      )}
      {...props}
    >
      {icon}
      <div className="flex-1">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
