"use client";

import { useEffect, useState } from "react";
import "./campus.css";

const PLACES = [
  { src: "/inspire/oxford.jpg", place: "Radcliffe Camera, Oxford", region: "Europe", credit: "CC BY 4.0" },
  { src: "/inspire/cambridge.jpg", place: "King’s College Chapel, Cambridge", region: "Europe", credit: "CC BY-SA 3.0" },
  { src: "/inspire/iit-bombay.jpg", place: "Main building, IIT Bombay", region: "India", credit: "CC BY-SA 4.0" },
  { src: "/inspire/iisc.jpg", place: "Indian Institute of Science, Bengaluru", region: "India", credit: "CC BY-SA 4.0" },
  { src: "/inspire/mit.jpg", place: "Great Dome, MIT", region: "United States", credit: "CC BY-SA 4.0" },
  { src: "/inspire/tsinghua.jpg", place: "West gate, Tsinghua University", region: "China", credit: "CC0" },
] as const;

const QUOTES = [
  { text: "The important thing is not to stop questioning.", who: "Albert Einstein", src: "/inspire/einstein.jpg" },
  { text: "Nothing in life is to be feared, it is only to be understood.", who: "Marie Curie", src: "/inspire/curie.jpg" },
  { text: "If I have seen further it is by standing on the shoulders of giants.", who: "Isaac Newton", src: "/inspire/newton.jpg" },
] as const;

export function CampusAtmosphere() {
  const [place, setPlace] = useState(0);
  const [quote, setQuote] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlace((n) => (n + 1) % PLACES.length);
      setQuote((n) => (n + 1) % QUOTES.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, []);

  const line = QUOTES[quote];
  const here = PLACES[place];

  return (
    <aside className="campus-atmosphere" aria-label="Campus">
      {PLACES.map((item, index) => (
        <img
          key={item.src}
          src={item.src}
          alt=""
          className={index === place ? "campus-photo is-on" : "campus-photo"}
        />
      ))}
      <div className="campus-veil" />
      <figure className="campus-caption">
        <img className="campus-portrait" src={line.src} alt="" />
        <blockquote>
          <p>{line.text}</p>
          <footer>{line.who}</footer>
        </blockquote>
        <figcaption>
          {here.region} · {here.place}
        </figcaption>
      </figure>
    </aside>
  );
}
