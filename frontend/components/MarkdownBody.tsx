"use client";

import { Fragment } from "react";

export function parseInline(text: string, key: string | number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0;

  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|~~(.+?)~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  re.lastIndex = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={`${key}-t${i++}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    if (match[2] !== undefined) {
      // bold — text-slate-50 participates in inversion → near-black in light mode
      parts.push(<strong key={`${key}-b${i++}`} className="font-semibold text-slate-50">{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={`${key}-e${i++}`} className="italic text-slate-300">{match[3]}</em>);
    } else if (match[4] !== undefined) {
      parts.push(<code key={`${key}-c${i++}`} className="md-inline-code bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
    } else if (match[5] !== undefined) {
      parts.push(<a key={`${key}-a${i++}`} href={match[6]} target="_blank" rel="noopener noreferrer" className="md-link text-indigo-400 underline hover:text-indigo-300 transition-colors">{match[5]}</a>);
    } else if (match[7] !== undefined) {
      parts.push(<s key={`${key}-s${i++}`} className="text-slate-500">{match[7]}</s>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<Fragment key={`${key}-tail`}>{text.slice(lastIndex)}</Fragment>);
  }
  return parts.length === 0 ? text : parts;
}

function renderTable(lines: string[], key: number) {
  const rows = lines.map(l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
  const [header, , ...body] = rows;
  return (
    <div key={key} className="overflow-x-auto mb-3 rounded-xl border border-slate-700/60">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-slate-700/60">
          <tr>
            {header.map((cell, ci) => (
              <th key={ci} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                {parseInline(cell, `th-${key}-${ci}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {body.map((row, ri) => (
            <tr key={ri} className="hover:bg-slate-700/30 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2.5 text-slate-200 align-top">
                  {parseInline(cell, `td-${key}-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Fenced code block
    if (line.startsWith("```")) {
      const codeKey = i;
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      nodes.push(
        <pre key={codeKey} className="md-code-block bg-slate-800 border border-slate-700/60 rounded-xl p-3 mb-2 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
          <code className={lang ? `language-${lang}` : ""}>{codeLines.join("\n")}</code>
        </pre>
      );
      i++; continue;
    }

    // Table
    if (line.trim().startsWith("|") && line.trim().endsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const tableKey = i;
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]); i++;
      }
      nodes.push(renderTable(tableLines, tableKey));
      continue;
    }

    // Headings (check deeper levels first to avoid prefix collision)
    const h6 = line.match(/^######\s+(.*)/);
    const h5 = line.match(/^#####\s+(.*)/);
    const h4 = line.match(/^####\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h6) { nodes.push(<p   key={i} className="text-xs font-semibold mt-2 mb-0.5 text-slate-400 uppercase tracking-wide">{parseInline(h6[1], i)}</p>); i++; continue; }
    if (h5) { nodes.push(<p   key={i} className="text-xs font-semibold mt-2 mb-0.5 text-slate-300">{parseInline(h5[1], i)}</p>); i++; continue; }
    if (h4) { nodes.push(<h4  key={i} className="text-sm font-semibold mt-2 mb-1 text-slate-200">{parseInline(h4[1], i)}</h4>); i++; continue; }
    if (h3) { nodes.push(<h3  key={i} className="text-sm font-semibold mt-3 mb-1 text-slate-200">{parseInline(h3[1], i)}</h3>); i++; continue; }
    if (h2) { nodes.push(<h2  key={i} className="text-sm font-bold mt-4 mb-1 text-slate-100 border-b border-slate-700/50 pb-1">{parseInline(h2[1], i)}</h2>); i++; continue; }
    if (h1) { nodes.push(<h1  key={i} className="text-base font-bold mt-4 mb-1 text-slate-50">{parseInline(h1[1], i)}</h1>); i++; continue; }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-slate-700 my-3" />); i++; continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} className="border-l-2 border-indigo-500 pl-3 my-2 text-slate-400 italic">
          {parseInline(line.slice(2), i)}
        </blockquote>
      ); i++; continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s/.test(line)) {
      const listKey = i;
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s/, "")); i++;
      }
      nodes.push(
        <ul key={listKey} className="list-disc list-outside ml-5 mb-2 space-y-0.5">
          {items.map((it, idx) => <li key={idx} className="leading-relaxed text-slate-200">{parseInline(it, `ul-${listKey}-${idx}`)}</li>)}
        </ul>
      ); continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listKey = i;
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, "")); i++;
      }
      nodes.push(
        <ol key={listKey} className="list-decimal list-outside ml-5 mb-2 space-y-0.5">
          {items.map((it, idx) => <li key={idx} className="leading-relaxed text-slate-200">{parseInline(it, `ol-${listKey}-${idx}`)}</li>)}
        </ol>
      ); continue;
    }

    // Blank line
    if (line.trim() === "") { i++; continue; }

    // Paragraph
    nodes.push(
      <p key={i} className="mb-2 last:mb-0 leading-relaxed text-slate-200">
        {parseInline(line, i)}
      </p>
    );
    i++;
  }

  return <div className="md-body">{nodes}</div>;
}
