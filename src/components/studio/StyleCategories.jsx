function StyleCategories({ categories, selectedCategory, onSelect }) {
  return (
    <div className="studio-categories-shell">
      <div className="studio-categories" aria-label="Filter styles by category">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`studio-category-chip ${selectedCategory === category ? "active" : ""}`}
            onClick={() => onSelect(category)}
            aria-pressed={selectedCategory === category}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StyleCategories;
