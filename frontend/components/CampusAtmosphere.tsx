"use client";

import { useEffect, useState } from "react";
import "./campus.css";

const PLACES = [
  { src: "/inspire/europe-essex.jpg", place: "University of Essex, Colchester campus", region: "Europe", credit: "Wikimedia Commons" },
  { src: "/inspire/india-iiser.jpg", place: "IISER Thiruvananthapuram", region: "India", credit: "Wikimedia Commons" },
  { src: "/inspire/us-uc-davis.jpg", place: "University of California, Davis", region: "United States", credit: "Wikimedia Commons" },
  { src: "/inspire/china-xiamen.jpg", place: "Xiamen University", region: "China", credit: "Wikimedia Commons" },
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
