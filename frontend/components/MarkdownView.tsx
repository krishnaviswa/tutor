import type { ReactNode } from "react";

function parseBlocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const nextKey = () => {
    key += 1;
    return key;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      blocks.push(<Tag key={nextKey()}>{heading[2]}</Tag>);
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(<li key={nextKey()}>{lines[i].replace(/^\s*[-*]\s+/, "")}</li>);
        i += 1;
      }
      blocks.push(<ul key={nextKey()}>{items}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(<li key={nextKey()}>{lines[i].replace(/^\s*\d+[.)]\s+/, "")}</li>);
        i += 1;
      }
      blocks.push(<ol key={nextKey()}>{items}</ol>);
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push(<p key={nextKey()}>{para.join(" ")}</p>);
  }
  return blocks;
}

/** Headings, paragraphs, and lists as React elements. Text is escaped by React. */
export function MarkdownView({ source }: { source: string }) {
  return <div className="terms-md">{parseBlocks(source)}</div>;
}
