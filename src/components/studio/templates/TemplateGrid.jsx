import TemplateCard from "./TemplateCard";

function TemplateGrid({ templates = [], onSelectTemplate }) {
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
        />
      ))}
    </div>
  );
}

export default TemplateGrid;