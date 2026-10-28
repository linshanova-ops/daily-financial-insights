"use client";

import Image from "next/image";
import avocadoMascot from "../../public/brand/avocado-mascot.png";

/** Today-hero mark: avocado waves for 3s, then rests. */
export function WelcomeWave() {
  return (
    <div className="welcome-wave flex flex-col items-start">
      <Image
        src={avocadoMascot}
        alt=""
        width={200}
        height={200}
        priority
        className="welcome-wave__avocado h-36 w-36 object-contain drop-shadow-md sm:h-44 sm:w-44 lg:h-52 lg:w-52"
      />
    </div>
  );
}
