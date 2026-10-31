import { COMPONENT_CATEGORIES, COMPONENT_META, COMPONENT_TYPES } from "../engine/catalog";
import "./components.css";

export function Palette() {
  return (
    <div className="palette">
      {COMPONENT_CATEGORIES.map((category) => (
        <div className="palette-group" key={category}>
          <p className="palette-group-title">{category}</p>
          {COMPONENT_TYPES.filter((type) => COMPONENT_META[type].category === category).map((type) => (
            <div
              key={type}
              className="palette-item"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/reactflow", type);
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <span className="palette-sigla">{COMPONENT_META[type].sigla}</span>
              <span>{COMPONENT_META[type].label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
