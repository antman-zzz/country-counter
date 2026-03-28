import React, { useState, useMemo, useEffect } from "react";
// @ts-ignore
import * as RSM from "../vendor/react-simple-maps.js";

const {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  ZoomableGroup
} = RSM as any;

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  visitedCountries: Set<string>;
  onCountryClick: (countryCode: string) => void;
  visitedColor: string;
  visitedData: Record<string, string[]>;
  viewMode: "basic" | "year" | "plan";
  onColorChange: (color: string) => void;
  onModeChange: (mode: "basic" | "year" | "plan") => void;
  yearlyColors: Record<string, string>;
  homeCountry: string | null;
  readOnly?: boolean;
  isFullScreen?: boolean;
  screenshotUrl?: string;
  plannedCountries?: Set<string>;
}

const WorldMap: React.FC<WorldMapProps> = ({ 
  visitedCountries, onCountryClick, visitedColor, visitedData, viewMode, onColorChange, onModeChange, yearlyColors, homeCountry, readOnly, isFullScreen, screenshotUrl, plannedCountries = new Set()
}) => {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [showControls, setShowControls] = useState(true);
  const [hasSelectedOrientation, setHasSelectedOrientation] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fade out controls in fullscreen mode
  useEffect(() => {
    if (isFullScreen && showControls && hasSelectedOrientation) {
      const timer = setTimeout(() => setShowControls(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isFullScreen, showControls, hasSelectedOrientation]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const scale = 100;
  const worldWidth = scale * 2 * Math.PI;

  const getRegionConfig = (mobile: boolean, isFS: boolean, orient: string) => {
    if (isFS && orient === "portrait") {
      return { center: [0, 23] as [number, number], zoom: mobile ? 1.8 : 1.2 };
    }
    return { center: [0, 23] as [number, number], zoom: mobile ? 1.5 : 0.9 };
  };

  const { center, zoom } = useMemo(() => getRegionConfig(isMobile, !!isFullScreen, orientation), [isMobile, isFullScreen, orientation]);

  const defaultYearlyColors = ["#e74c3c", "#3498db", "#9b59b6", "#f1c40f", "#1abc9c", "#e67e22", "#34495e", "#d35400", "#27ae60", "#ff69b4"];
  const getYearlyColor = (year: string) => yearlyColors[year] || defaultYearlyColors[parseInt(year) % 10];

  const mapHeight = useMemo(() => {
    if (!isFullScreen) return isMobile ? 450 : 350;
    return orientation === "portrait" ? 1000 : 450;
  }, [isFullScreen, isMobile, orientation]);

  const handleSelectOrientation = (orient: "portrait" | "landscape") => {
    setOrientation(orient);
    setHasSelectedOrientation(true);
    setShowControls(true);
  };

  return (
    <div className={`map-component-root ${isFullScreen ? 'is-fullscreen' : ''} ${isFullScreen ? orientation : ''}`} onClick={() => isFullScreen && setShowControls(true)}>
      {isFullScreen && !hasSelectedOrientation && (
        <div className="orientation-picker-overlay">
          <div className="orientation-picker-card">
            <h3>Choose Map Orientation</h3>
            <p>Select how you want to capture your world map.</p>
            <div className="orientation-options">
              <button className="btn-orient-choice" onClick={() => handleSelectOrientation("portrait")}>
                <span className="orient-icon">📱</span>
                Vertical (Portrait)
              </button>
              <button className="btn-orient-choice" onClick={() => handleSelectOrientation("landscape")}>
                <span className="orient-icon">🖥️</span>
                Horizontal (Landscape)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="map-container" onMouseMove={handleMouseMove} style={{ position: "relative", backgroundColor: "#f0f8ff", overflow: "hidden" }}>
        <ComposableMap 
          projection="geoMercator" 
          projectionConfig={{ scale: scale }} 
          height={mapHeight} 
          style={{ width: "100%", height: isFullScreen ? (orientation === "portrait" ? "auto" : "100vh") : "auto" }}
        >
          <ZoomableGroup 
            key={`${isMobile}-${orientation}`} 
            center={center} 
            zoom={zoom}
            maxZoom={12} 
            minZoom={0.2} 
            translateExtent={[[-Infinity, -150], [Infinity, 450]]}
          >
            <Graticule stroke="#E4E5E6" strokeWidth={0.5} />
            {[-1, 0, 1].map((offset) => (
              <g key={offset} transform={`translate(${offset * worldWidth}, 0)`}>
                <Geographies geography={geoUrl}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geo: any) => {
                      const countryId = geo.id ? String(geo.id).padStart(3, "0") : null;
                      if (!countryId) return null;
                      const isVisited = visitedCountries.has(countryId);
                      const isHome = countryId === homeCountry;
                      const years = visitedData[countryId];
                      // Find the earliest year visited
                      const year = years && years.length > 0 ? [...years].sort((a, b) => a.localeCompare(b))[0] : null;

                      let fillColor = isVisited ? visitedColor : "#D6D6DA";
                      if (isVisited && viewMode === "year" && year) fillColor = getYearlyColor(year);
                      if (isHome) fillColor = "#f1c40f"; // Gold for home country
                      
                      // Plan mode highlight
                      const isPlanned = plannedCountries.has(countryId);
                      if (!isVisited && !isHome && isPlanned) fillColor = "#ff9f43"; // Orange for planned

                      return (
                        <Geography
                          key={`${offset}-${geo.rsmKey}`}
                          geography={geo}
                          onClick={() => {
                            if (readOnly) return;
                            // In plan mode, only allow clicks on non-visited countries
                            if (viewMode === "plan" && isVisited) return;
                            onCountryClick(countryId);
                          }}

                          onMouseEnter={() => setTooltipContent(`${geo.properties.name}${year ? ` (${year})` : ""}${isPlanned ? " (Planned)" : ""}`)}
                          onMouseLeave={() => setTooltipContent("")}
                          style={{
                            default: { fill: fillColor, stroke: "#FFFFFF", strokeWidth: 0.5, outline: "none" },
                            hover: { 
                              fill: isVisited ? fillColor : (readOnly ? fillColor : (viewMode === "plan" && isVisited ? fillColor : "#F53")), 
                              fillOpacity: 0.8, 
                              stroke: "#FFFFFF", 
                              strokeWidth: 0.5, 
                              outline: "none", 
                              cursor: readOnly || (viewMode === "plan" && isVisited) ? "default" : "pointer" 
                            },
                            pressed: { fill: readOnly || (viewMode === "plan" && isVisited) ? fillColor : "#E42", outline: "none" }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </g>
            ))}
          </ZoomableGroup>
        </ComposableMap>
        {tooltipContent && (
          <div 
            className="map-tooltip" 
            style={{ 
              position: "fixed", 
              left: tooltipPosition.x + 15, 
              top: tooltipPosition.y + 15,
              pointerEvents: "none"
            }}
          >
            {tooltipContent}
          </div>
        )}

        <div className={`map-overlay-actions ${isFullScreen && !showControls ? 'fade-hide' : ''}`}>
          {screenshotUrl && !isFullScreen && (
            <a 
              href={screenshotUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-fullscreen-toggle no-decoration"
            >
              <span className="btn-icon">📷</span>
              <span className="btn-text">Screenshot Mode</span>
            </a>
          )}
          
          {isFullScreen && hasSelectedOrientation && (
            <div className="fullscreen-controls">
              <div className="orientation-toggle-group">
                <button className={`btn-orient ${orientation === 'portrait' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setOrientation('portrait'); }}>Vertical</button>
                <button className={`btn-orient ${orientation === 'landscape' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setOrientation('landscape'); }}>Horizontal</button>
              </div>
              <button 
                className="btn-fullscreen-toggle close-tab-btn" 
                onClick={(e) => { e.stopPropagation(); window.close(); }}
                title="Close this tab"
              >
                ✕ Close Tab
              </button>
            </div>
          )}
        </div>
      </div>

      {!readOnly && !isFullScreen && (
        <div className="map-controls-compact">
          <div className="compact-control-group">
            <div className="compact-item mode-toggle">
              <span className="compact-label">Mode:</span>
              <div className="segmented-control-mini">
                <button className={`btn-slim-mini ${viewMode === 'basic' ? 'active' : ''}`} onClick={() => onModeChange("basic")}>basic</button>
                <button className={`btn-slim-mini ${viewMode === 'year' ? 'active' : ''}`} onClick={() => onModeChange("year")}>year</button>
                <button className={`btn-slim-mini ${viewMode === 'plan' ? 'active' : ''}`} onClick={() => onModeChange("plan")}>plan</button>
              </div>
            </div>

            {viewMode === "basic" && (
              <div className="compact-item color-item">
                <div className="color-picker-dot-mini">
                  <input type="color" value={visitedColor} onChange={(e) => onColorChange(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMap;
