import Image from "next/image";

export function IobLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden ${className}`}>
      <Image
        src="/images/logo.png"
        alt="Indian Overseas Bank"
        fill
        className="object-cover object-center"
        sizes="56px"
        priority
      />
    </span>
  );
}
