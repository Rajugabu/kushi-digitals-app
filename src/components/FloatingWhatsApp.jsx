import { MessageCircle } from "lucide-react";
import { createWhatsAppLink } from "../config/business";

function FloatingWhatsApp() {
  const message =
    "Hello Kushi Digitals, I visited your website and would like to know more about your services.";

  return (
    <a
      href={createWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-whatsapp"
      aria-label="Chat with Kushi Digitals on WhatsApp"
      title="Chat with Kushi Digitals"
    >
      <span
        className="whatsapp-pulse"
        aria-hidden="true"
      />

      <MessageCircle size={25} />

      <span className="floating-whatsapp-text">
        Chat with us
      </span>
    </a>
  );
}

export default FloatingWhatsApp;