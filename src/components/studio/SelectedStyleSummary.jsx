import { Images, Sparkles } from "lucide-react";
import { formatStudioPrice } from "../../config/studioStyles";

function SelectedStyleSummary({ style, onChangeStyle }) {
  return (
    <div className="studio-selected-summary">
      <div className="studio-selected-thumbnail">
        <img
          src={style.thumbnail}
          alt=""
          style={{ objectPosition: style.thumbnailPosition }}
        />
      </div>
      <div className="studio-selected-copy">
        <span>Selected style</span>
        <strong>{style.name}</strong>
        <small>{style.category}</small>
      </div>
      <div className="studio-selected-meta">
        <span>
          <Sparkles size={14} /> {formatStudioPrice(style)}
        </span>
        <span>
          <Images size={14} /> {style.photosRequired} {style.photosRequired === 1 ? "photo" : "photos"}
        </span>
      </div>
      <button type="button" onClick={onChangeStyle} className="studio-change-style">
        Change style
      </button>
    </div>
  );
}

export default SelectedStyleSummary;
