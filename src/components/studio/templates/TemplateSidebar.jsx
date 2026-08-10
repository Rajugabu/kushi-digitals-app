import {
  CakeSlice,
  CalendarDays,
  Heart,
  Image,
  Images,
  Moon,
  Mountain,
  PartyPopper,
  Quote,
  Sparkles,
  Star,
  Sun,
  Video,
  WandSparkles,
} from "lucide-react";
import { TEMPLATE_FILTERS } from "./templateData";

const categoryIcons = {
  all: WandSparkles,
  "Good Morning": Sun,
  "Good Night": Moon,
  Birthday: CakeSlice,
  Anniversary: CalendarDays,
  Love: Heart,
  Motivation: Star,
  Festival: PartyPopper,
  Devotional: Sparkles,
  Quotes: Quote,
  Nature: Mountain,
  "Special Days": Image,
  "type:photo": Images,
  "type:video": Video,
};

function TemplateSidebar({
  selectedCategory = "all",
  onSelectCategory,
}) {
  return (
    <aside
      className="kushi-template-sidebar"
      aria-label="Template categories"
    >
      <div className="kushi-template-sidebar__nav">
        {TEMPLATE_FILTERS.map((category) => {
          const Icon = categoryIcons[category.id] || Image;
          const isActive = selectedCategory === category.id;

          return (
            <button
              key={category.id}
              type="button"
              className={`kushi-template-sidebar__item ${
                isActive ? "is-active" : ""
              }`}
              aria-pressed={isActive}
              onClick={() => onSelectCategory?.(category.id)}
            >
              <span className="kushi-template-sidebar__icon">
                <Icon size={19} />
              </span>

              <span>{category.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default TemplateSidebar;
