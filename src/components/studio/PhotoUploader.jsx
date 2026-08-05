import { ImagePlus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useId, useState } from "react";
import { getStudioPreviewStyle } from "../../utils/studioPreview";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function isAcceptedFile(file) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(extension);
}

function PhotoUploader({
  label,
  helperText,
  photo,
  outputRatio,
  onFile,
  onRemove,
  error,
  onError,
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [naturalPreview, setNaturalPreview] = useState(null);
  const naturalDimensions = naturalPreview?.previewUrl === photo?.previewUrl
    ? naturalPreview
    : null;

  const previewStyle = getStudioPreviewStyle({
    ratio: outputRatio,
    width: naturalDimensions?.width,
    height: naturalDimensions?.height,
  });

  const handleFile = (file) => {
    if (!file) {
      return;
    }

    if (!isAcceptedFile(file)) {
      onError("Please choose a JPG, JPEG, PNG or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onError("This photo is larger than 20 MB. Please choose a smaller file.");
      return;
    }

    onError("");
    onFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="studio-uploader" style={previewStyle}>
      <div className="studio-uploader-heading">
        <div>
          <strong>{label}</strong>
          <span>{helperText}</span>
        </div>
        {photo && <span className="studio-upload-ready">Ready</span>}
      </div>

      <div
        className={`studio-upload-box ${photo ? "has-photo" : ""} ${isDragging ? "dragging" : ""} ${error ? "has-error" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <label htmlFor={inputId} className="studio-upload-label">
          {photo ? (
            <>
              <span className="studio-upload-preview">
                <img
                  src={photo.previewUrl}
                  alt={`Full preview of ${label.toLowerCase()}`}
                  onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;

                    if (naturalWidth > 0 && naturalHeight > 0) {
                      setNaturalPreview({
                        previewUrl: photo.previewUrl,
                        width: naturalWidth,
                        height: naturalHeight,
                      });
                    }
                  }}
                />
              </span>
              <span className="studio-replace-photo">
                <RefreshCw size={16} /> Replace photo
              </span>
            </>
          ) : (
            <span className="studio-upload-empty">
              <span className="studio-upload-icon">
                {isDragging ? <ImagePlus size={28} /> : <UploadCloud size={28} />}
              </span>
              <strong>{isDragging ? "Drop your photo here" : "Drop a photo or browse"}</strong>
              <span>JPG, JPEG, PNG or WEBP · Max 20 MB</span>
              <small>Full image preserved — no preview cropping</small>
            </span>
          )}
          <input
            id={inputId}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>

        {photo && (
          <button
            type="button"
            className="studio-remove-photo"
            onClick={onRemove}
            aria-label={`Remove ${label.toLowerCase()}`}
            title="Remove photo"
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>

      {error && <p className="studio-field-error" role="alert">{error}</p>}
      {photo && <p className="studio-upload-filename" title={photo.file.name}>{photo.file.name}</p>}
    </div>
  );
}

export default PhotoUploader;
