import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { LoginCard } from "@/components/login-card";
import {
  IconFacebook,
  IconGallery,
  IconInstagram,
  IconX,
  IconYoutube,
} from "@/components/iob-icons";

const SOCIAL = [
  { label: "Facebook", Icon: IconFacebook },
  { label: "X", Icon: IconX },
  { label: "Instagram", Icon: IconInstagram },
  { label: "YouTube", Icon: IconYoutube },
  { label: "Gallery", Icon: IconGallery },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <SiteHeader variant="login" />

      <div className="iob-hero-login relative flex-1 overflow-hidden">
        <Image
          src="/images/hero-login.png"
          alt=""
          fill
          className="hidden object-cover object-left-bottom md:block"
          sizes="100vw"
          priority
        />

        <div className="absolute left-0 top-16 z-20 hidden flex-col md:flex">
          {SOCIAL.map(({ label, Icon }) => (
            <span
              key={label}
              title={label}
              className="flex h-8 w-8 items-center justify-center bg-[#0d8fa8]/80 text-white"
            >
              <Icon />
            </span>
          ))}
        </div>

        <div className="relative z-10 flex min-h-[calc(100dvh-6.5rem)] items-center justify-center px-4 py-8 md:justify-end md:pr-12">
          <LoginCard />
        </div>
      </div>
    </div>
  );
}
