import { html, render } from "lit-html";
import {
  Civ,
  Entity,
  MajorGod,
  MinorGod,
  Unit,
  Building,
  Technology,
  Ability,
  GodPower,
} from "./types/civ.ts"; // Assuming you moved civ.ts to src/types/

// Our module-scoped variable, initialized to null.
let data: Civ | null = null;

// --- STATE MANAGEMENT ---

let activeEntityName: string | null = localStorage.getItem("activeEntity") || null;
let activeMajorGodKey: string = localStorage.getItem("activeMajorGod") || "zeus";
let activeBuilding: string | null = localStorage.getItem("activeBuilding") || "town_center";


// --- ASYNCHRONOUS DATA LOADING ---

/**
 * Fetches and loads data for a specific civilization.
 * @param civName The name of the civilization to load (e.g., 'greek').
 * @returns {Promise<boolean>} True if loading was successful, false otherwise.
 */
async function loadCivData(civName = 'greek'): Promise<boolean> {
  try {
    // THE FIX: The path must be relative to the project root, including `src`.
    const response = await fetch(`./src/data/civs/${civName}.json`, { cache: 'no-cache' });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    data = await response.json() as Civ;
    console.log("Civilization data loaded successfully:", data);
    return true; // Signal success

  } catch (error) {
    console.error("Could not load civilization data:", error);
    return false; // Signal failure
  }
}


// --- HELPERS ---

const STAT_ICONS = {
  hitpoints: "❤️",
  hack_armor: "🦺",
  pierce_armor: "🛡️",
  crush_armor: "🪨",
  speed: "👟",
  hack_damage: "⚔️",
  pierce_damage: "🏹",
  crush_damage: "💥",
  divine_damage: "⚡",
  reload_time: "〽️",
  range: "🎯",
  garrison: "🏰",
};

const GOD_ICONS = {
  zeus: "⚡",
  poseidon: "🔱",
  hades: "💀",
  default: "❓",
};

function setActiveEntityName(entityName: string | null) {
  console.log("Setting activeEntityName:", entityName);
  activeEntityName = entityName;
  localStorage.setItem("activeEntity", entityName || "");
}

function setActiveBuilding(buildingName: string | null) {
  console.log("Setting activeBuilding:", buildingName);
  activeBuilding = buildingName ? buildingName.toLowerCase() : null;
  setActiveEntityName(null); 
  localStorage.setItem("activeBuilding", buildingName || "");
  renderAll();
}

function findRelatedBuildings(
  entityName: string,
  buildings: Record<string, Building>,
  relation: "trains_units" | "researches_techs"
): string[] {
  if (!data) return [];
  return Object.values(buildings)
    .filter((building) => building.functions[relation]?.includes(entityName))
    .map((building) => building.name);
}

function findGodPowers(
  god: MajorGod | MinorGod,
  godPowers: Record<string, GodPower>
): GodPower[] {
  if (!data) return [];
  return (god.godPowers || [])
    .map((name) => godPowers[name])
    .filter((power): power is GodPower => !!power);
}

function findEntityByName(entityName: string | null): Entity | null {
    if (!entityName || !data) return null;

    const nameLower = entityName.toLowerCase();
    for (const key of ['units', 'buildings', 'technologies', 'majorGods', 'minorGods', 'abilities', 'godPowers']) {
        const collection = data[key as keyof Civ] as Record<string, Entity>;
        if (collection) {
            const entityKey = Object.keys(collection).find(k => k.toLowerCase() === nameLower);
            if (entityKey && collection[entityKey]) return collection[entityKey];
            const found = Object.values(collection).find(e => e.name.toLowerCase() === nameLower);
            if (found) return found;
        }
    }
    return null;
}


// --- TEMPLATES (No changes needed in this section) ---

const majorGodsTemplate = (gods: Record<string, MajorGod>) => {
  const godKeys = Object.keys(gods);
  const numGods = godKeys.length;
  const numTotalCards = numGods + 1;
  const activeIndex = godKeys.indexOf(activeMajorGodKey);

  const selectGod = (key: string) => {
    activeMajorGodKey = key;
    localStorage.setItem("activeMajorGod", key);
    renderAll();
  };
  const openAddGodModal = () => console.log("Opening Add God Modal...");
  const openEditGodModal = (god: MajorGod) => console.log("Editing:", god.name);
  const removeGod = (key: string) => console.log("Removing god:", key);

  return html`
    ${godKeys.map((key, i) => {
      const god = gods[key];
      let offset = i - activeIndex;
      if (offset > numTotalCards / 2) offset -= numTotalCards;
      if (offset < -numTotalCards / 2) offset += numTotalCards;
      return html`
        <article
          class="card major-god"
          data-offset=${offset}
          style="background-image: url('${god.image || 'assets/placeholder.jpg'}')"
          @click=${() => offset !== 0 && selectGod(key)}
        >
          <h4>${god.name}</h4>
          <p>${god.tagline}</p>
          ${offset === 0 ? html`
            <div class="card-actions">
              <button @click=${(e: Event) => { e.stopPropagation(); openEditGodModal(god); }} title="Edit">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button @click=${(e: Event) => { e.stopPropagation(); removeGod(key); }} title="Remove">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          ` : ''}
        </article>
      `;
    })}
    ${(() => {
        let offset = numGods - activeIndex;
        if (offset > numTotalCards / 2) offset -= numTotalCards;
        return html`
        <article
            class="card add-new-god"
            data-offset=${offset}
            @click=${openAddGodModal}
        >
            <i class="fa-solid fa-plus"></i>
        </article>
        `;
    })()}
  `;
};

const minorGodsTemplate = (gods: Record<string, MinorGod>) => {
  if (!data) return ''; // Guard clause
  return html`
    ${Object.values(gods)
      .filter(god => !god.prerequisite_god || god.prerequisite_god.toLowerCase() === activeMajorGodKey)
      .map(god => html`
          <div class="tile minor-god" @click=${() => showPreview(god)} tabindex="0">
            <img src="${god.image || "assets/placeholder.jpg"}" alt="${god.name}" class="sprite" />
            <h5>${god.name}</h5>
            <p>${god.tagline}</p>
          </div>
        `
      )}
  `;
}

function createUnitsTechsGridLayout(
  units: Record<string, Unit>,
  technologies: Record<string, Technology>
): (Entity | null)[][] {
  const layout: (Entity | null)[][] = [
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
  ];

  if (!activeBuilding || !data) return layout;
  const building = Object.values(data.buildings).find(b => b.name.toLowerCase() === activeBuilding);
  if (!building) return layout;

  const trainableUnits = (building.functions.trains_units || [])
    .map(unitKey => {
        const keyLower = unitKey.toLowerCase();
        return units[keyLower] || Object.values(units).find(u => u.name.toLowerCase() === keyLower);
    })
    .filter((unit): unit is Unit => !!unit);
  
  trainableUnits.slice(0, 6).forEach((unit, i) => { layout[0][i] = unit; });

  const researchableTechs = (building.functions.researches_techs || [])
    .map(techKey => {
        const keyLower = techKey.toLowerCase();
        return technologies[keyLower] || Object.values(technologies).find(t => t.name.toLowerCase() === keyLower);
    })
    .filter((tech): tech is Technology => !!tech);

  const unitBasedTechs: Technology[] = [];
  const mythicGenericTechs: Technology[] = [];
  researchableTechs.forEach(tech => {
    const hasUnitEffect = tech.effects.some(
      (effect) => effect.noun.unit_name || effect.noun.unit_tags?.length
    );
    if (hasUnitEffect) {
      unitBasedTechs.push(tech);
    } else {
      mythicGenericTechs.push(tech);
    }
  });

   trainableUnits.forEach((unit, index) => {
    if (index >= 6) return;
    const matchingTech = unitBasedTechs.find(tech =>
      tech.effects.some(effect =>
        (effect.noun.unit_name === unit.name) ||
        (effect.noun.unit_tags?.some(tag => unit.unit_tags.includes(tag) || unit.unit_category.toLowerCase() === tag.replace('is_', '')))
      )
    );
    if (matchingTech) {
      layout[1][index] = matchingTech;
      const techIndex = unitBasedTechs.indexOf(matchingTech);
      unitBasedTechs.splice(techIndex, 1);
    }
  });

  const minorGods = data.majorGods[activeMajorGodKey]?.minorGods || [];
  const validTechs = mythicGenericTechs
    .filter(tech => !tech.prerequisite_god || minorGods.includes(tech.prerequisite_god));
  
  validTechs.slice(0, 6).forEach((tech, i) => { layout[2][i] = tech; });

  return layout;
}

const unitsTechsTemplate = (
  units: Record<string, Unit>,
  technologies: Record<string, Technology>
) => {
    const gridLayout = createUnitsTechsGridLayout(units, technologies);
    return html`
    ${gridLayout.map(row => row.map(entity => {
        if (!entity) {
            return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;
        }
        return html`
        <div 
            class="tile ${entity.type} ${activeEntityName === entity.name ? "active" : ""}"
            @click=${() => showPreview(entity)}
        >
            <img src="${entity.image || 'assets/placeholder.jpg'}" class="sprite" alt="${entity.name}"/>
            <h5>${entity.name}</h5>
        </div>`;
    }))}`;
}

const buildingGridLayout = [
  ["house", null, null, null, "temple", "dock"],
  ["barracks", "archery_range", "stable", null, "market", "armory"],
  ["town_center", "wall", "tower", "fortress", null, "wonder"],
];

const buildingsTemplate = (buildings: Record<string, Building>) => html`
  ${buildingGridLayout.map(row => row.map(buildingKey => {
    if (!buildingKey) {
      return html`<div class="tile placeholder"><span class="plus-icon">+</span></div>`;
    }
    const building = Object.values(buildings).find(b => b.name.toLowerCase() === buildingKey);
    if (!building) return html`<div class="tile empty"></div>`;
    
    return html`
      <div
        class="tile building ${activeBuilding === building.name.toLowerCase() ? "active" : ""}"
        @click=${() => {
          setActiveBuilding(building.name);
          showPreview(building);
        }}
        tabindex="0"
      >
        <img src="${building.image || "assets/placeholder.jpg"}" alt="${building.name}" class="sprite" />
        <h5>${building.name}</h5>
      </div>`;
  }))}`;


// --- PREVIEW LOGIC ---

const previewCardTemplate = (entity: Entity | null) => {
  if (!entity) {
    return html`<div class="preview-card" style="display:flex; align-items:center; justify-content:center; min-height:200px;">Select an item.</div>`;
  }
  
  const god = entity.prerequisite_god || (entity.type === 'majorGod' ? entity.name.toLowerCase() : activeMajorGodKey);
  const isRanged = 'attack' in entity && entity.attack?.type === 'ranged';

  return html`
  <div class="preview-card">
      <div class="bg-god-logo">${GOD_ICONS[god as keyof typeof GOD_ICONS] || GOD_ICONS.default}</div>
      <header class="preview-card-header">
          <div class="title-group">
              <h2>${entity.name}</h2>
              <span class="user">by TheBradFad</span>
          </div>
          <div class="toolbar">
              <div class="level">1</div>
              <div><button title="Info">ℹ️</button><button title="Stats">📈</button></div>
          </div>
      </header>
      <div class="preview-card-stats">
          ${'hitpoints' in entity && entity.hitpoints ? html`<span>${STAT_ICONS.hitpoints} ${entity.hitpoints}</span>` : ''}
          ${'defensive_stats' in entity && entity.defensive_stats ? html`
              <span>${STAT_ICONS.hack_armor} ${entity.defensive_stats.hack_armor}%</span>
              <span>${STAT_ICONS.pierce_armor} ${entity.defensive_stats.pierce_armor}%</span>
              <span>${STAT_ICONS.crush_armor} ${entity.defensive_stats.crush_armor}%</span>
          ` : ''}
          ${'speed' in entity && entity.speed ? html`<span>${STAT_ICONS.speed} ${entity.speed}</span>` : ''}
      </div>
      <div class="preview-card-body">
          <div class="portrait"><img src="${entity.image || 'https://placehold.co/90x120'}" alt="${entity.name}"/></div>
          ${'attack' in entity && entity.attack ? html`
          <div class="attack-details">
              <h3>${entity.attack.type?.toUpperCase()} ATTACK</h3>
              <div class="stats-grid">
                  ${entity.attack.hack_damage ? html`<div class="label">${STAT_ICONS.hack_damage} Hack</div><div class="value">${entity.attack.hack_damage}</div>` : ''}
                  ${entity.attack.pierce_damage ? html`<div class="label">${STAT_ICONS.pierce_damage} Pierce</div><div class="value">${entity.attack.pierce_damage}</div>` : ''}
                  ${entity.attack.crush_damage ? html`<div class="label">${STAT_ICONS.crush_damage} Crush</div><div class="value">${entity.attack.crush_damage}</div>` : ''}
                  ${'reload_time' in entity.attack && entity.attack.reload_time ? html`<div class="label">${STAT_ICONS.reload_time} Reload</div><div class="value">${entity.attack.reload_time}s</div>` : ''}
                  ${isRanged && entity.attack.range ? html`<div class="label">${STAT_ICONS.range} Range</div><div class="value">${entity.attack.range}</div>` : ''}
                  ${Object.entries(entity.attack).filter(([k,v])=>k.startsWith('vs_')&& v && v > 1).map(([k,v])=>html`<div class="multipliers">${v}x vs ${k.replace('vs_','')}</div>`)}
              </div>
          </div>` : ''}
      </div>
  </div>`;
};

function showPreview(entity: Entity) {
  setActiveEntityName(entity.name);
  const template = previewCardTemplate(entity);

  if (window.matchMedia("(max-width: 768px)").matches) {
    const modal = document.getElementById("preview-modal");
    const content = modal?.querySelector(".preview-pane");
    if (modal && content instanceof HTMLElement) { 
      render(template, content);
      modal.style.display = "flex";
    }
  } else {
    const containerSelector = entity.type === "building" ? ".buildings .preview-pane" : ".units-techs .preview-pane";
    const container = document.querySelector(containerSelector);
    if (container instanceof HTMLElement) { 
      render(template, container);
    }
  }
  renderAll();
}


// --- RENDER & INITIALIZATION ---

function renderAll() {
  // Guard Clause: If data hasn't been loaded, do nothing.
  if (!data) {
    console.warn("renderAll called before data was loaded. Aborting.");
    return;
  }

  const carouselContainer = document.querySelector('.major-gods .carousel');
    if (carouselContainer instanceof HTMLElement) {
        render(majorGodsTemplate(data.majorGods), carouselContainer);
    }

  const minorGodsContainer = document.querySelector(".minor-gods .grid");
  if(minorGodsContainer instanceof HTMLElement) render(minorGodsTemplate(data.minorGods), minorGodsContainer);

  const buildingsContainer = document.querySelector(".buildings .buildings-grid");
  if(buildingsContainer instanceof HTMLElement) render(buildingsTemplate(data.buildings), buildingsContainer);

  const unitsTechsContainer = document.querySelector(".units-techs .units-techs-grid");
  if(unitsTechsContainer instanceof HTMLElement) render(unitsTechsTemplate(data.units, data.technologies), unitsTechsContainer);
}


/**
 * The main entry point for the application.
 */
async function main() {
  // Step 1: Attempt to load the critical data.
  const isDataLoaded = await loadCivData('greek');

  // If data loading fails, halt execution to prevent further errors.
  if (!isDataLoaded) {
    console.error("APPLICATION HALTED: Could not initialize due to data loading failure.");
    // Optionally, display a user-friendly error message on the screen here.
    return; 
  }

  // Step 2: Now that data is guaranteed to be loaded, proceed with rendering.
  renderAll();
    
  // Step 3: Set up initial state and previews safely.
  const initialEntity = findEntityByName(activeEntityName || activeBuilding);
  if (initialEntity) {
      showPreview(initialEntity);
  }
}

// Global event listener to kick things off.
document.addEventListener('DOMContentLoaded', () => {
    // Set up non-data-dependent listeners first.
    const modal = document.getElementById('preview-modal');
    modal?.addEventListener('click', (e) => {
        if (e.target === modal || (e.target as HTMLElement).classList.contains('modal-close-btn')) {
            if (modal instanceof HTMLElement) {
              modal.style.display = 'none';
            }
        }
    });

    // Call the main async function to start the application logic.
    main();
});
