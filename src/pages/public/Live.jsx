import SEO from "../../components/SEO";
import "../../styles/live.css";

const configuredUrl = import.meta.env.VITE_LIVE_APPS_SCRIPT_URL || "";
const uploadUrl = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(configuredUrl) ? configuredUrl : "";

export default function Live() {
  return <section className="live-page">
    <SEO title="Kushi Live Studio | Live Photo Upload" description="Kushi Live Studio – సరదాగా కాసేపు Live Photo Editing కోసం మీ Photo Upload చేయండి." canonical="https://kushidigitals.com/live" />
    <header className="live-hero">
      <p className="live-brand">KUSHI LIVE STUDIO</p>
      <span className="live-badge">🔴 LIVE PHOTO EDITING</span>
      <h1 lang="te">సరదాగా కాసేపు</h1>
      <h2 lang="te">మీ Photo కూడా Live లో Beautifulగా Edit చేయించుకోవాలా?</h2>
      <p lang="te">కింద Photo Upload చేయండి. మీ Turn వచ్చినప్పుడు YouTube Liveలో Edit చేస్తాము.</p>
    </header>
    {uploadUrl ? <>
      <iframe className="live-upload-frame" src={uploadUrl} title="Kushi Live Studio photo upload" referrerPolicy="strict-origin-when-cross-origin" />
      <p className="live-fallback">Form కనిపించకపోతే <a href={uploadUrl} target="_blank" rel="noopener noreferrer">Upload form తెరవండి ↗</a></p>
    </> : <div className="live-unavailable" role="status">Photo uploads త్వరలో ప్రారంభమవుతాయి. కొద్దిసేపటి తర్వాత మళ్లీ చూడండి.</div>}
    <section className="live-steps" lang="te">
      <h2>Liveలో ఎలా పని చేస్తుంది?</h2>
      <ol><li>Photo Upload చేయండి</li><li>YouTube Liveలో “PHOTO SENT” అని Comment చేయండి</li><li>మీ Turn వచ్చినప్పుడు Before &amp; After Editing చూడండి</li></ol>
    </section>
  </section>;
}
