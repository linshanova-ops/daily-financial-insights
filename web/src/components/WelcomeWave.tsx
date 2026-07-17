"use client";

import Image from "next/image";
import avocadoMascot from "../../public/brand/avocado-mascot.png";

const WELCOME_LINE =
  "Welcome to syravocado — hope you enjoy today’s brief.";

/**
 * Today-hero greeting: freestanding avocado waves + slight grow for 3s;
 * welcome line is clear then disappears when the wave ends.
 */
export function WelcomeWave() {
  return (
    <div className="welcome-wave flex flex-col items-start gap-3 sm:gap-4">
      <Image
        src={avocadoMascot}
        alt=""
        width={200}
        height={200}
        priority
        className="welcome-wave__avocado h-36 w-36 object-contain drop-shadow-md sm:h-44 sm:w-44 lg:h-52 lg:w-52"
      />
      <p className="welcome-wave__line max-w-xl text-xl font-medium leading-snug text-ink-soft sm:text-2xl lg:text-[1.7rem]">
        {WELCOME_LINE}
      </p>
    </div>
  );
}
