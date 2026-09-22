import type { Anchor } from '../data/schema';
import { telUrl, whatsappUrl } from '../lib/geo';

export function DayAnchors({ anchors }: { anchors: Anchor[] }) {
  if (anchors.length === 0) {
    return <p className="muted">No fixed commitments today. The whole day is yours.</p>;
  }
  return (
    <ul className="anchors">
      {anchors.map((a, i) => (
        <li className="anchor" key={`${a.time}-${i}`}>
          <span className="time">{a.time}</span>
          <div>
            <div className="title">{a.title}</div>
            {a.note && <div className="note">{a.note}</div>}
          </div>
          <div className="actions">
            {a.phone && (
              <a className="icon-btn" href={telUrl(a.phone)} aria-label={`Call ${a.title}`} title={a.phone}>
                ☏
              </a>
            )}
            {a.whatsapp && (
              <a
                className="icon-btn"
                href={whatsappUrl(a.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${a.title}`}
              >
                ✆
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
