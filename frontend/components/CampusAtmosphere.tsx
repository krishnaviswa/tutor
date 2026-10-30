import "./campus.css";

/**
 * Decorative pen-and-ink campus studies. The layer is aria-hidden and
 * pointer-events: none (see campus.css). It is not a control.
 */
export function CampusAtmosphere() {
  return (
    <div className="campus-atmosphere" aria-hidden="true">
      <svg className="campus-sketch campus-sketch--oxford" viewBox="0 0 200 176" fill="none">
        <title>Radcliffe Camera, Oxford</title>
        <path className="wash" d="M46 118c2-36 24-62 54-62s52 26 54 62v6H46z" />
        <path d="M36 142h128M44 136h112M52 130h96" />
        <path d="M58 130v-8M142 130v-8" />
        <path d="M54 122h92" />
        <path d="M62 122v-16M74 122v-16M86 122v-16M100 122v-16M114 122v-16M128 122v-16M140 122v-16" />
        <path d="M58 106h84" />
        <path d="M64 106V90M78 106V90M92 106V90M108 106V90M122 106V90M136 106V90" />
        <path d="M58 90h84" />
        <path d="M62 90c1-2 3-3 6-3h64c3 0 5 1 6 3" />
        <path d="M48 86c2-2 8-4 14-4M152 86c-2-2-8-4-14-4" />
        <path d="M52 82c8-28 22-46 48-46s40 18 48 46" />
        <path d="M70 80c5-16 14-26 30-26s25 10 30 26" />
        <path d="M96 36v-8h8v8" />
        <path d="M92 28h16" />
        <path d="M96 28c0-7 2-12 4-12s4 5 4 12" />
        <path d="M94 16h12" />
        <path d="M99 16v-5M101 11h-1" />
      </svg>

      <svg className="campus-sketch campus-sketch--kings" viewBox="0 0 320 132" fill="none">
        <title>King&apos;s College Chapel, Cambridge</title>
        <path className="wash" d="M18 108V42h284v66z" />
        <path d="M14 108h292" />
        <path d="M18 42h284" />
        <path d="M18 108V42M302 108V42" />
        <path d="M22 42v-10M34 42v-8M58 42v-8M82 42v-8M106 42v-8M130 42v-8M154 42v-8M178 42v-8M202 42v-8M226 42v-8M250 42v-8M274 42v-8M298 42v-10" />
        <path d="M18 32h8M30 34h8M54 34h8M78 34h8M102 34h8M126 34h8M150 34h8M174 34h8M198 34h8M222 34h8M246 34h8M270 34h8M294 32h8" />
        <path d="M24 22l2-10 2 10M32 24l2-8 2 8M60 24l2-8 2 8M84 24l2-8 2 8M108 24l2-8 2 8M132 24l2-8 2 8M156 24l2-8 2 8M180 24l2-8 2 8M204 24l2-8 2 8M228 24l2-8 2 8M252 24l2-8 2 8M276 24l2-8 2 8M296 22l2-10 2 10" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bay) => {
          const x = 36 + bay * 24;
          return (
            <g key={bay}>
              <path d={`M${x} 100V52h14v48`} />
              <path d={`M${x + 7} 100V52`} />
              <path d={`M${x} 76h14M${x} 64h14`} />
              <path d={`M${x + 3} 52l4-6 4 6`} />
            </g>
          );
        })}
        <path d="M36 100h248" />
        <path d="M148 108v-20h24v20" />
        <path d="M156 88v-8h8v8" />
      </svg>

      <svg className="campus-sketch campus-sketch--dome" viewBox="0 0 220 150" fill="none">
        <title>Great Dome, Massachusetts Institute of Technology</title>
        <path className="wash" d="M28 118V86h164v32z" />
        <path d="M18 128h184M28 120h164M38 114h144" />
        <path d="M46 114V86M62 114V86M78 114V86M94 114V86M110 114V86M126 114V86M142 114V86M158 114V86M174 114V86" />
        <path d="M40 86h140" />
        <path d="M58 86V74h104v12" />
        <path d="M66 74c2-22 16-40 44-40s42 18 44 40" />
        <path d="M86 72c2-12 10-22 24-22s22 10 24 22" />
        <path d="M102 32v-8h16v8" />
        <path d="M98 24h24" />
        <path d="M104 24c0-8 3-14 6-14s6 6 6 14" />
        <path d="M108 10v-6" />
      </svg>
    </div>
  );
}
