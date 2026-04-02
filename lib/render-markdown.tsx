'use client';

import React from 'react';

/**
 * Renders the subset of markdown used in AI chat responses:
 *   **bold**, - / * bullet lists, 1. ordered lists, --- horizontal rule, paragraph breaks.
 * No external dependencies — handles exactly what the API produces.
 */

type Block =
  | { kind: 'hr' }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'p'; lines: string[] };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const hrSections = text.split(/\n---(?:\n|$)/);

  hrSections.forEach((section, sIdx) => {
    if (sIdx > 0) blocks.push({ kind: 'hr' });

    const lines = section.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Unordered list
      if (/^[-*] /.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*] /.test(lines[i])) {
          items.push(lines[i].replace(/^[-*] /, ''));
          i++;
        }
        blocks.push({ kind: 'ul', items });
        continue;
      }

      // Ordered list
      if (/^\d+\. /.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\. /, ''));
          i++;
        }
        blocks.push({ kind: 'ol', items });
        continue;
      }

      // Blank line — skip
      if (line.trim() === '') { i++; continue; }

      // Paragraph — collect consecutive non-list non-blank lines
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^[-*] /.test(lines[i]) &&
        !/^\d+\. /.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length) blocks.push({ kind: 'p', lines: paraLines });
    }
  });

  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  );
}

function renderBlock(block: Block, key: number): React.ReactNode {
  if (block.kind === 'hr') return <hr key={key} className="border-border my-1" />;
  if (block.kind === 'ul') return (
    <ul key={key} className="list-disc list-inside space-y-0.5">
      {block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
    </ul>
  );
  if (block.kind === 'ol') return (
    <ol key={key} className="list-decimal list-inside space-y-0.5">
      {block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
    </ol>
  );
  return (
    <p key={key} className="leading-relaxed">
      {block.lines.map((line, i) => (
        <React.Fragment key={i}>{i > 0 && <br />}{renderInline(line)}</React.Fragment>
      ))}
    </p>
  );
}

export function MarkdownText({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={className ?? 'space-y-1.5'}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
