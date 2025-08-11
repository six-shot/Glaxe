// src/components/HeroExact.jsx
import Image from "next/image";
import heroBg from "../../public/nHwTsLPGkmoINM0pwwdsOWuyhaE.jpg";
import { HeroHeader } from "./navbar";
import DynamicBackground from "./DynamicBackground";
import { Button } from "./ui/button";
import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center">
      <div
        className="framer-s35tte"
        data-framer-name="Hero"
        style={{
          flex: "1 0 0px",
          gap: "10px",
          height: "1px",
          overflow: "visible",
          position: "relative",
          width: "100%",
        }}
      >
        {/* Background Image */}
        <div
          data-framer-background-image-wrapper="true"
          style={{ position: "absolute", borderRadius: "inherit", inset: 0 }}
        >
          <img
            decoding="async"
            width="1440"
            height="1575"
            sizes="100vw"
            src={heroBg.src}
            srcSet="/nHwTsLPGkmoINM0pwwdsOWuyhaE.jpg?scale-down-to=1024 936w, /nHwTsLPGkmoINM0pwwdsOWuyhaE.jpg 1440w"
            alt=""
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              borderRadius: "inherit",
              objectPosition: "49.9% 100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Grain Effect Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            backgroundImage: "url('/11.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "cover",
            pointerEvents: "none",
            opacity: 0.6,
            mixBlendMode: "soft-light",
          }}
        />

        <div style={{ position: "relative" }}>
          <HeroHeader />
          <div className="flex justify-center items-center h-[calc(100vh-225px)] mt-10 relative">
            <div className="relative w-[720px] h-[720px]">
              <div className="absolute inset-0 border border-dashed border-[#ffffff]/35 rotate-45 flex justify-center items-center">
                <div className="w-[480px] h-[480px] border border-dashed border-[#ffffff]/35 flex justify-center items-center">
                  <div className=" w-[320px] h-[214px] -rotate-45">
                    <Image
                      src="/logo.png"
                      alt="logo"
                      className=""
                      width={320}
                      height={214}
                    />
                  </div>
                </div>
              </div>
              <Image
                src="/left.svg"
                alt="left"
                width={141}
                height={282}
                className="absolute -left-[260px] top-1/2 -translate-x-1/2 -translate-y-1/2"
              />
              <Image
                src="/right.svg"
                alt="right"
                width={141}
                height={282}
                className="absolute -right-[410px] top-1/2 -translate-x-1/2 -translate-y-1/2 "
              />
            </div>
          </div>
        </div>
      </div>
      <div className="h-[225px]  absolute w-full bottom-0 to-transparent  pb-[60px] pt-2.5  z-[1000] px-10 text-white">
        <div className=" max-w-[1720px] mx-auto w-full flex items-end justify-between">
          <div className="flex flex-col gap-5">
            <h4 className="capitalize text-[49px] font-[family-name:var(--font-galxe)] leading-[55px]">
              Your web3 growth engine
            </h4>

            <p className="text-[20px] text-white">
              Build Smarter. Scale Faster. Engage Better.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" size="sm">
                <Link href="/">Launch App</Link>
              </Button>
              <Button variant="outline" size="sm">
                <Link href="/">Build with Galxe</Link>
              </Button>
            </div>
          </div>
          <div className=" h-[58px] ">
            <div className=" flex  items-center justify-between h-full   border border-white/20">
              <div className="px-[18px] border-r border-white/20">
                <Image
                  src="/x.svg"
                  className=""
                  alt="x"
                  width={24}
                  height={22}
                />
              </div>
              <div className="px-[18px]">
                <Image
                  src="/telegram.svg"
                  alt="telegram"
                  width={26}
                  height={26}
                  className=" "
                />
              </div>
              <div className="px-[18px] border-l border-white/20">
                <Image
                  src="/discord.svg"
                  alt="discord"
                  width={26}
                  height={26}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

