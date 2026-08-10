import TemplateCard from "./TemplateCard";

function TemplateGrid({
  templates = [],
  onSelectTemplate,
  selectedTemplateId,
  profilePhotoUrl = "",
  profileCutoutUrl = "",
  profileFullName = "",
  photoOverrides = {},
  photoAdjustments = {},
}) {
  if (!templates.length) {
    return (
      <div className="kushi-template-empty">
        <p>No templates available right now.</p>
      </div>
    );
  }

  return (
    <div className="kushi-template-grid">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onSelect={onSelectTemplate}
          isSelected={selectedTemplateId === template.id}
          userPhoto={photoOverrides[template.id] || profilePhotoUrl}
          userCutoutPhoto={
            photoOverrides[template.id] ? "" : profileCutoutUrl
          }
          userName={profileFullName}
          photoAdjustment={photoAdjustments[template.id]}
        />
      ))}
    </div>
  );
}

export default TemplateGrid;
