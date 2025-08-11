"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import React from "react";
import Image from "next/image";

const menuItems = [
  { name: "Product", href: "/" },
  { name: "Developers", href: "/about" },
  { name: "Gravity", href: "/products" },
  { name: "Company", href: "/services" },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="px-10">
      <nav
        data-state={menuState && "active"}
        className=" fixed top-0 left-0 right-0 z-[200] font-[family-name:var(--font-galxe)] "
      >
        <div className="">
          <div
            className={`max-w-[1720px] mx-auto md:w-full md:h-[82px] flex items-center transition-all duration-300 ${
              isScrolled ? "" : ""
            }`}
          >
            <div className="transition-all duration-300 flex justify-between w-full">
              <div className="relative flex items-center justify-between gap-6 py-3 w-full lg:grid lg:grid-cols-3 lg:gap-0 lg:py-4">
                <div className="flex w-full items-center justify-between lg:w-auto lg:justify-self-start lg:col-start-1">
                  <Link href="/" aria-label="home" className="">
                    <Image src="/logo.svg" alt="logo" width={102} height={20} />
                  </Link>

                  <button
                    onClick={() => setMenuState(!menuState)}
                    aria-label={menuState ? "Close Menu" : "Open Menu"}
                    className="relative z-20 block cursor-pointer lg:hidden"
                    data-state={menuState ? "active" : "inactive"}
                  >
                    <div className="flex flex-col gap-[4px]">
                      <div
                        className={`w-[30px] h-[2px] bg-black transition-all duration-300 ${
                          menuState ? "rotate-45 translate-y-[6px]" : ""
                        }`}
                      />
                      <div
                        className={`w-[30px] h-[2px] bg-black transition-all duration-300 ${
                          menuState ? "opacity-0 scale-0" : ""
                        }`}
                      />
                      <div
                        className={`w-[30px] h-[2px] bg-black transition-all duration-300 ${
                          menuState ? "-rotate-45 -translate-y-[6px]" : ""
                        }`}
                      />
                    </div>
                  </button>
                </div>
                <div className="hidden lg:flex bg-[#000000] h-[42px] px-[21px] items-center rounded-[100px] lg:justify-self-center">
                  <ul className="flex gap-10 text-sm">
                    {menuItems.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className={` hover:text-[#fff] block duration-150  ${
                            pathname === item.href
                              ? "text-[#fff]"
                              : "text-[#fff]"
                          }`}
                        >
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={`fixed top-[72px] left-0 right-0 bottom-0 z-[1000] bg-black/80 backdrop-blur-md transition-all duration-300 lg:hidden ${
                    menuState ? "opacity-100 visible" : "opacity-0 invisible"
                  }`}
                  onClick={() => setMenuState(false)}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300 ${
                      menuState ? "translate-y-0" : "translate-y-full"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <ul className="space-y-6 text-base">
                        {menuItems.map((item, index) => (
                          <li key={index}>
                            <Link
                              href={item.href}
                              className={`text-muted-foreground hover:text-accent-foreground block duration-150 ${
                                pathname === item.href
                                  ? "text-black"
                                  : "text-[#525866]"
                              }`}
                              onClick={() => setMenuState(false)}
                            >
                              <span>{item.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 pt-6 border-t">
                        <Button
                          asChild
                          variant="default"
                          size="sm"
                          className="w-full"
                        >
                          <Link href="#" onClick={() => setMenuState(false)}>
                            <span className="text-black">Get Started</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5 items-center lg:justify-self-end">
                  <Button asChild variant="outline" size="sm">
                    <Link href="#">
                      <span>Enterprise</span>
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="#">
                      <span>Launch App</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
