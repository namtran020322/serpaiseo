import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface DomainWithFaviconProps {
  domain: string;
  className?: string;
  showFullDomain?: boolean;
  maxLength?: number;
  size?: "sm" | "md";
}

const getFaviconUrl = (domain: string) => {
  // Clean domain for favicon lookup
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=16`;
};

const extractDomain = (url: string, maxLength?: number) => {
  const domain = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  
  if (maxLength && domain.length > maxLength) {
    return domain.substring(0, maxLength) + "...";
  }
  return domain;
};

export function DomainWithFavicon({
  domain,
  className,
  showFullDomain = false,
  maxLength = 20,
  size = "md",
}: DomainWithFaviconProps) {
  const [imgError, setImgError] = useState(false);
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  const displayDomain = showFullDomain ? domain : extractDomain(domain, maxLength);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {imgError ? (
        <Globe className={cn(iconSize, "text-muted-foreground flex-shrink-0")} />
      ) : (
        <img
          src={getFaviconUrl(domain)}
          alt=""
          className={cn(iconSize, "flex-shrink-0")}
          onError={() => setImgError(true)}
        />
      )}
      <span className="truncate" title={domain}>
        {displayDomain}
      </span>
    </div>
  );
}
