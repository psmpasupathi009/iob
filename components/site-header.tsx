import Link from "next/link";
import { IobLogo } from "@/components/iob-logo";
import { LogoutButton } from "@/components/logout-button";
import {
  IconBell,
  IconChevron,
  IconGear,
  IconHelp,
  IconPin,
  IconUser,
} from "@/components/iob-icons";

type Variant = "landing" | "login" | "dashboard";

const NAV = [
  { label: "About us" },
  { label: "Payment", chevron: true },
  { label: "Cards", chevron: true },
  { label: "Loans", chevron: true },
  { label: "Services", chevron: true },
  { label: "Offers" },
  { label: "Download" },
  { label: "FAQs" },
  { label: "Contact us" },
];

export function SiteHeader({
  variant,
  userName,
}: {
  variant: Variant;
  userName?: string;
}) {
  const barClass =
    variant === "login"
      ? "iob-header-login px-4 py-2 text-white sm:px-6 lg:px-8"
      : "iob-header px-3 py-2 text-white sm:px-4 lg:px-8";

  const ticker =
    variant === "landing"
      ? "1800 890 4445 | 1800 425 4445 | eseeadmin@iob.bank.in | 044 - 28889121 or 044-71729121"
      : "Dear Customer, Welcome to IOB Net Banking.";

  return (
    <header className="w-full">
      <div className={barClass}>
        <div className="flex items-center gap-3">
          <Link
            href={variant === "dashboard" ? "/dashboard" : "/"}
            className="flex min-w-0 items-center gap-3"
          >
            <IobLogo className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
            <div className="min-w-0 leading-[1.12]">
              <div className="truncate text-[11px] sm:text-[12px]">इण्डियन ओवरसीज़ बैंक</div>
              <div className="truncate text-[13px] font-semibold sm:text-[15px]">
                Indian Overseas Bank
              </div>
              <div className="hidden text-[9px] tracking-wide text-white/90 sm:block">
                आपकी प्रगति का सच्चा साथी · Good people to grow with
              </div>
            </div>
          </Link>

          {variant !== "landing" ? (
            <>
              <span className="mx-3 hidden h-11 w-px bg-white/50 md:block" />
              <span className="hidden text-[16px] font-medium md:inline">
                IOB Internet Banking
              </span>
            </>
          ) : null}

          <div className="flex-1" />

          {variant === "landing" ? (
            <div className="hidden items-center gap-5 text-[11px] md:flex">
              <span>Tollfree: 1800 890 4445 | 1800 425 4445</span>
              <span className="flex flex-col items-center gap-0.5">
                <IconPin className="h-4 w-4" />
                ATM and branch locator
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <IconHelp className="h-4 w-4" />
                Get help
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/70 px-2 py-1">
                A English <IconChevron />
              </span>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-4 text-[10px] sm:gap-6">
              <span className="flex flex-col items-center gap-0.5">
                <IconHelp className="h-5 w-5" />
                Get help
              </span>
              {variant === "login" ? (
                <>
                  <span className="hidden flex-col items-center gap-0.5 sm:flex">
                    <IconPin className="h-5 w-5" />
                    ATM and branch locator
                  </span>
                  <span className="hidden rounded-[3px] bg-white px-1.5 py-1 text-[11px] font-extrabold leading-none tracking-tight text-[#0069b4] md:inline">
                    DICGC
                  </span>
                </>
              ) : (
                <>
                  <span className="relative hidden flex-col items-center gap-0.5 sm:flex">
                    <span className="relative">
                      <IconBell className="h-5 w-5" />
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    Notification
                  </span>
                  <span className="flex items-center gap-1.5">
                    <IconUser className="h-5 w-5" />
                    <span className="hidden max-w-[140px] truncate sm:inline">{userName}</span>
                    <IconGear className="hidden h-5 w-5 md:block" />
                  </span>
                  <LogoutButton />
                </>
              )}
            </div>
          )}
        </div>

        {variant === "landing" ? (
          <nav className="iob-nav -mx-3 mt-1 hidden overflow-x-auto whitespace-nowrap text-[13px] md:-mx-4 md:flex md:px-4 lg:-mx-8 lg:overflow-visible lg:px-8">
            {NAV.map((item, i) => (
              <span key={item.label} className="inline-flex shrink-0 items-center">
                {i > 0 ? <span className="h-4 w-px bg-white/35" /> : null}
                <span className="flex cursor-default items-center gap-1 px-3 py-1.5 hover:bg-white/10">
                  {item.label}
                  {item.chevron ? <IconChevron className="h-2.5 w-2.5 opacity-80" /> : null}
                </span>
              </span>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="overflow-hidden border-b border-[#e6e6e6] bg-white px-4 py-1.5">
        <p className="iob-ticker iob-marquee">
          {ticker}
          <span className="mx-16">{ticker}</span>
        </p>
      </div>
    </header>
  );
}
