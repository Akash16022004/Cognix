import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';

function MermaidBlock({ code }) {
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(svg);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (!cancelled) {
          setSvg(null);
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!svg) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  // eslint-disable-next-line react/no-danger
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default MermaidBlock;

