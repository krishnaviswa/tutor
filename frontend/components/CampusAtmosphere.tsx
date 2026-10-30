"use client";

import { useEffect, useState } from "react";
import "./campus.css";

/** Wikimedia Commons photographs. One image at a time, only behind sign-in. */
const PLACES = [
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Radcliffe_Camera_Oxford_2018_03.jpg/1600px-Radcliffe_Camera_Oxford_2018_03.jpg",
    place: "Radcliffe Camera, Oxford",
    region: "Europe",
    credit: "CC BY 4.0",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/20130215_Kings_College_Chapel_Hi-res_01.jpg/1600px-20130215_Kings_College_Chapel_Hi-res_01.jpg",
    place: "King’s College Chapel, Cambridge",
    region: "Europe",
    credit: "CC BY-SA 3.0",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Main_building_in_IIT_Bombay.jpg/1600px-Main_building_in_IIT_Bombay.jpg",
    place: "Main building, IIT Bombay",
    region: "India",
    credit: "CC BY-SA 4.0",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Main_Building%2C_Indian_Institute_of_Science%2C_Bangalore%2C_Karnataka%2C_India_%282017%29.jpg/1600px-Main_Building%2C_Indian_Institute_of_Science%2C_Bangalore%2C_Karnataka%2C_India_%282017%29.jpg",
    place: "Indian Institute of Science, Bengaluru",
    region: "India",
    credit: "CC BY-SA 4.0",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Great_dome_of_MIT%2C_Feb_2021.jpg/1600px-Great_dome_of_MIT%2C_Feb_2021.jpg",
    place: "Great Dome, MIT",
    region: "United States",
    credit: "CC BY-SA 4.0",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/West_school_gate_of_Tsinghua_University%2C_2011042202.jpg/1600px-West_school_gate_of_Tsinghua_University%2C_2011042202.jpg",
    place: "West gate, Tsinghua University",
    region: "China",
    credit: "CC0",
  },
] as const;

const QUOTES = [
  {
    text: "The important thing is not to stop questioning.",
    who: "Albert Einstein",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/320px-Albert_Einstein_Head.jpg",
  },
  {
    text: "Nothing in life is to be feared, it is only to be understood.",
    who: "Marie Curie",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/320px-Marie_Curie_c._1920s.jpg",
  },
  {
    text: "If I have seen further it is by standing on the shoulders of giants.",
    who: "Isaac Newton",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Portrait_of_Sir_Isaac_Newton%2C_1689.jpg/320px-Portrait_of_Sir_Isaac_Newton%2C_1689.jpg",
  },
] as const;

export function CampusAtmosphere() {
  const [place, setPlace] = useState(0);
  const [quote, setQuote] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlace((n) => (n + 1) % PLACES.length);
      setQuote((n) => (n + 1) % QUOTES.length);
    }, 14000);
    return () => window.clearInterval(timer);
  }, []);

  const line = QUOTES[quote];
  const here = PLACES[place];

  return (
    <div className="campus-atmosphere" aria-hidden="true">
      {PLACES.map((item, index) => (
        <img key={item.place} src={item.src} alt="" className={index === place ? "is-on" : undefined} />
      ))}
      <div className="campus-veil" />
      <figure className="campus-caption">
        <img src={line.src} alt="" />
        <blockquote>
          <p>{line.text}</p>
          <footer>{line.who}</footer>
        </blockquote>
        <figcaption>
          {here.region} · {here.place} · {here.credit}
        </figcaption>
      </figure>
    </div>
  );
}
