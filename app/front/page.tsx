"use client";

import ToroWelcomeMenu from "./inicio/Inicio";
import AmbientBackdrop from "../components/ambient-backdrop";


export default function FrontPage() {
  return (
    <div className="isolate bg-[#080808]">
      <AmbientBackdrop />
      <ToroWelcomeMenu />
    </div>
  );
}
