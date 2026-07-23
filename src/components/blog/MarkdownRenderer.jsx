import { isSafeUrl } from "../../config/blog";

const inlinePattern =
  /(!?\[[^\]]*]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;

function renderInline(text, keyPrefix) {
  const nodes = [];
  let lastIndex = 0;
  let match;

  inlinePattern.lastIndex = 0;

  while (
    (match = inlinePattern.exec(text)) !==
    null
  ) {
    if (match.index > lastIndex) {
      nodes.push(
        text.slice(lastIndex, match.index),
      );
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;

    if (token.startsWith("![")) {
      const imageMatch = token.match(
        /^!\[([^\]]*)]\(([^)]+)\)$/,
      );
      const source =
        imageMatch?.[2]?.trim();

      if (
        imageMatch &&
        isSafeUrl(source) &&
        !source
          .toLowerCase()
          .startsWith("mailto:")
      ) {
        nodes.push(
          <img
            key={key}
            src={source}
            alt={imageMatch[1]}
            loading="lazy"
          />,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(
        /^\[([^\]]+)]\(([^)]+)\)$/,
      );
      const href = linkMatch?.[2]?.trim();

      if (
        linkMatch &&
        isSafeUrl(href)
      ) {
        const external =
          /^https?:\/\//i.test(href);

        nodes.push(
          <a
            key={key}
            href={href}
            target={
              external ? "_blank" : undefined
            }
            rel={
              external
                ? "noopener noreferrer"
                : undefined
            }
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(
          linkMatch?.[1] || token,
        );
      }
    } else if (
      token.startsWith("**") ||
      token.startsWith("__")
    ) {
      nodes.push(
        <strong key={key}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key}>
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <em key={key}>
          {token.slice(1, -1)}
        </em>,
      );
    }

    lastIndex =
      match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function MarkdownRenderer({
  content = "",
  className = "",
}) {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed
        .slice(3)
        .trim();
      const codeLines = [];
      index += 1;

      while (
        index < lines.length &&
        !lines[index]
          .trim()
          .startsWith("```")
      ) {
        codeLines.push(lines[index]);
        index += 1;
      }

      index += 1;
      blocks.push(
        <pre key={`code-${index}`}>
          <code
            data-language={
              language || undefined
            }
          >
            {codeLines.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    const headingMatch = trimmed.match(
      /^(#{1,6})\s+(.+)$/,
    );

    if (headingMatch) {
      const level =
        headingMatch[1].length;
      const Heading =
        `h${level}`;

      blocks.push(
        <Heading key={`heading-${index}`}>
          {renderInline(
            headingMatch[2],
            `heading-${index}`,
          )}
        </Heading>,
      );
      index += 1;
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      blocks.push(
        <hr key={`rule-${index}`} />,
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines = [];

      while (
        index < lines.length &&
        lines[index]
          .trim()
          .startsWith(">")
      ) {
        quoteLines.push(
          lines[index]
            .trim()
            .replace(/^>\s?/, ""),
        );
        index += 1;
      }

      blocks.push(
        <blockquote
          key={`quote-${index}`}
        >
          {renderInline(
            quoteLines.join(" "),
            `quote-${index}`,
          )}
        </blockquote>,
      );
      continue;
    }

    const unorderedMatch = trimmed.match(
      /^[-*+]\s+(.+)$/,
    );
    const orderedMatch = trimmed.match(
      /^\d+\.\s+(.+)$/,
    );

    if (unorderedMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items = [];
      const pattern = ordered
        ? /^\d+\.\s+(.+)$/
        : /^[-*+]\s+(.+)$/;

      while (index < lines.length) {
        const itemMatch =
          lines[index]
            .trim()
            .match(pattern);

        if (!itemMatch) {
          break;
        }

        items.push(itemMatch[1]);
        index += 1;
      }

      const List = ordered ? "ol" : "ul";

      blocks.push(
        <List key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li
              key={`${item}-${itemIndex}`}
            >
              {renderInline(
                item,
                `list-${index}-${itemIndex}`,
              )}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(
        lines[index].trim(),
      ) &&
      !/^```/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index].trim()) &&
      !/^[-*+]\s+/.test(
        lines[index].trim(),
      ) &&
      !/^\d+\.\s+/.test(
        lines[index].trim(),
      )
    ) {
      paragraphLines.push(
        lines[index].trim(),
      );
      index += 1;
    }

    const paragraph =
      paragraphLines.join(" ");

    blocks.push(
      <p key={`paragraph-${index}`}>
        {renderInline(
          paragraph,
          `paragraph-${index}`,
        )}
      </p>,
    );
  }

  return (
    <div
      className={`blog-markdown ${className}`.trim()}
    >
      {blocks}
    </div>
  );
}

export default MarkdownRenderer;
