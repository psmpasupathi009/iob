import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { IobLogo } from "@/components/iob-logo";

const TILES = [
  { src: "/images/tile-digital.png", label: "Digital Bank" },
  { src: "/images/tile-feedback.png", label: "FeedBack (or) Complaints" },
  { src: "/images/tile-cyber.png", label: "Cyber Frauds" },
  { src: "/images/tile-phishing.png", label: "Phishing alerts" },
  { src: "/images/tile-etoken.png", label: "Etoken users" },
  { src: "/images/tile-rbi.png", label: "RBI warnings" },
  { src: "/images/tile-weather.png", label: "Weather updates" },
  { src: "/images/tile-donate.png", label: "Donation to PM care funds" },
];

const pill =
  "inline-flex w-full items-center justify-center rounded-full bg-linear-to-r from-[#016FBD] to-[#0EC3C4] px-5 py-2.5 text-sm font-semibold text-white shadow-md";

export default function HomePage() {
  return (
    <div className="min-h-full bg-white">
      <SiteHeader variant="landing" />

      <section className="grid items-center gap-6 px-4 py-6 sm:px-8 md:px-10 md:py-8 lg:grid-cols-[240px_1fr] lg:gap-8 lg:px-12">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <IobLogo className="h-14 w-14" />
            <div className="text-xl font-semibold text-[#016FBD]">Internet Banking</div>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/login" className={pill}>
              Login | Register
            </Link>
            <button type="button" className={pill}>
              Open Digital Account
            </button>
          </div>
        </div>

        <div className="relative h-[220px] w-full sm:h-[280px] lg:h-[340px]">
          <Image
            src="/images/hero-landing.png"
            alt="Banking Made Easy Anytime, Anywhere"
            fill
            className="object-contain object-center"
            sizes="(max-width: 1024px) 100vw, 70vw"
            priority
          />
        </div>
      </section>

      <section className="grid items-stretch gap-3 bg-iob-page px-3 pb-8 pt-1 sm:px-6 lg:grid-cols-[32%_1fr] lg:gap-4 lg:px-8">
        <aside className="rounded-md bg-[#016FBD] p-5 text-white shadow-sm">
          <h2 className="mb-3 text-xl font-bold">New features</h2>
          <ul className="space-y-3 text-[13px] leading-snug">
            <li>
              <strong>Internet Banking facility for Minors:</strong> All minor
              accounts are eligible to register for Internet Banking only with
              view facility.
            </li>
            <li>
              <strong>Standing Instruction facility:</strong> Customers can use
              Standing Instruction facility for IOB to IOB and Other Bank NEFT
              transactions.
            </li>
            <li>
              <strong>Addition of Nomination:</strong> Customers are given option
              to add nomination under Accounts → Nomination → Add Nomination.
            </li>
            <li>
              <strong>New Payment Aggregator-SBIepay:</strong> Additional payment
              option for bill payments and collections.
            </li>
          </ul>
        </aside>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TILES.map((tile) => (
            <div key={tile.label} className="overflow-hidden rounded-lg bg-white shadow-sm">
              <Image
                src={tile.src}
                alt={tile.label}
                width={240}
                height={160}
                className="h-auto w-full object-cover"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
