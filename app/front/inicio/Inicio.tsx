import React from "react";
import {
  Dumbbell,
  Flame,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface FeatureCardProps {
  icon: React.ReactNode;
  text: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, text }) => {
  return (
   <div
  className="
    relative
    flex
    items-center
    gap-4

    rounded-[20px]

    border border-white/[0.07]

    bg-white/[0.035]

    backdrop-blur-2xl

    px-5
    py-4

    transition-all
    duration-200

    hover:bg-white/4.5

    active:scale-[0.99]
  "
>

  {/* Icono */}
  <div
    className="
      flex
      h-12
      w-12
      shrink-0
      items-center
      justify-center

      rounded-xl

      bg-white/3

      border border-white/6
    "
  >
    {icon}
  </div>

  {/* Texto */}
  <div className="flex flex-col">

    <h3 className="text-[16px] font-medium tracking-[-0.02em] text-white">
      {text}
    </h3>

    <p className="mt-0.5 text-[13px] text-white/40">
      Registrá tu progreso automáticamente.
    </p>

  </div>
</div>
  );
};

export const ToroWelcomeMenu: React.FC = () => {
  return (
    <div
  className="
  relative
  flex
  min-h-dvh
  w-full
  flex-col
  justify-between
  overflow-hidden
  bg-[#080808]
  px-6
  pb-8
  pt-14
  text-white
  font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text','Segoe_UI',Roboto,sans-serif]
"
>
  {/* Background */}
{/* Fondo */}
<div className="absolute inset-0 bg-[#080808]" />

{/* Glow principal cayendo desde arriba */}
<div
  className="
    absolute
    top-0
    left-1/2
    h-105
    w-225
    -translate-x-1/2
    bg-linear-to-b
    from-[#A3FF12]/12
    via-[#A3FF12]/5
    to-transparent
    blur-[140px]
    pointer-events-none
  "
/>

{/* Glow secundario suave */}
<div
  className="
    absolute
    -top-20
    left-1/2
    h-55
    w-105
    -translate-x-1/2
    rounded-full
    bg-[#A3FF12]/10
    blur-[120px]
    pointer-events-none
  "
/>

{/* Luz inferior muy tenue */}
<div
  className="
    absolute
    -bottom-40
    left-1/2
    h-65
    w-130
    -translate-x-1/2
    rounded-full
    bg-white/2.5
    blur-[180px]
    pointer-events-none
  "
/>

{/* Viñeta */}
<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.03),transparent_65%)]" />

  {/* Header */}
  <div className="relative z-10 flex flex-col items-center drop-shadow-[0_10px_15px_rgba(0,0,0,0.7)]">
    <Image
      src="/header.png"
      alt="Toro Logo"
      width={100}
      height={150}
    />
  </div>

  {/* Features */}
  <div className="relative z-10 mx-auto my-auto w-full max-w-md space-y-3 py-10">

    <FeatureCard
      icon={<Dumbbell className="h-5 w-5 text-[#A3FF12]" />}
      text="Trackea tu entrenamiento"
    />

    <FeatureCard
      icon={<Flame className="h-5 w-5 text-[#A3FF12]" />}
      text="Controlá tus calorías"
    />

    <FeatureCard
      icon={<CheckCircle2 className="h-5 w-5 text-[#A3FF12]" />}
      text="Construí hábitos consistentes"
    />

    <p className="pt-4 text-center text-[13px] leading-relaxed text-white/45">
      Una experiencia premium,
      <span className="text-white font-medium">
        {" "}100% gratuita.
      </span>
    </p>

  </div>

  {/* Footer */}
  <div className="relative z-10 mx-auto w-full max-w-md">

    <div className="space-y-3">

      <Link
        href="/sign-in"
        className="
        block w-full
        rounded-[18px]
        border border-[#B8FF5B]/20
        bg-[#A3FF12]
        py-3.75
        text-[17px]
        font-semibold
        text-black
        transition-all
        duration-200
        active:scale-[0.99]
      "
      >
        <div className="flex items-center justify-center gap-2">
          Comencemos
          <ChevronRight className="h-5 w-5" />
        </div>
      </Link>
      <Link
  href="/login"
  className="
    w-full
    py-3.75
    text-[16px]
    font-medium
    text-white
    text-center
    block
    transition-opacity
    active:opacity-80
  "
>
  Iniciar sesión
</Link>

    </div>


  </div>

</div>
  );
};

export default ToroWelcomeMenu;
