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

type MapRegion = "asia" | "europe" | "americas" | null;

interface WorldMapProps {
  visitedCountries: Set<string>;
  onCountryClick: (countryCode: string) => void;
  visitedColor: string;
  visitedData: Record<string, string[]>;
  viewMode: "simple" | "yearly";
  onColorChange: (color: string) => void;
  onModeChange: (mode: "simple" | "yearly") => void;
  yearlyColors: Record<string, string>;
  mapRegion: "asia" | "europe" | "americas" | null;
  onRegionChange: (region: "asia" | "europe" | "americas") => void;
  homeCountry: string | null;
}

const WorldMap: React.FC<WorldMapProps> = ({ 
  visitedCountries, onCountryClick, visitedColor, visitedData, viewMode, onColorChange, onModeChange, yearlyColors, mapRegion, onRegionChange, homeCountry
}) => {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const scale = 100;
  const worldWidth = scale * 2 * Math.PI;

  const getRegionConfig = (region: MapRegion, mobile: boolean) => {
    switch (region) {
      case "asia": return { center: [100, 20] as [number, number], zoom: mobile ? 2.5 : 2.0 };
      case "europe": return { center: [15, 30] as [number, number], zoom: mobile ? 2.8 : 2.2 };
      case "americas": return { center: [-90, 20] as [number, number], zoom: mobile ? 2.2 : 1.8 };
      default: return { center: [0, 20] as [number, number], zoom: mobile ? 1.2 : 1.0 };
    }
  };

  const { center, zoom } = useMemo(() => getRegionConfig(mapRegion, isMobile), [mapRegion, isMobile]);

  const defaultYearlyColors = ["#e74c3c", "#3498db", "#9b59b6", "#f1c40f", "#1abc9c", "#e67e22", "#34495e", "#d35400", "#27ae60", "#ff69b4"];
  const getYearlyColor = (year: string) => yearlyColors[year] || defaultYearlyColors[parseInt(year) % 10];

  return (
    <div className="map-component-root">
      <div className="map-container" onMouseMove={handleMouseMove} style={{ position: "relative", backgroundColor: "#f0f8ff", overflow: "hidden" }}>
        <ComposableMap 
          projection="geoMercator" 
          projectionConfig={{ scale: scale }} 
          height={isMobile ? 500 : 450} 
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup 
            key={`${mapRegion}-${isMobile}`} 
            center={center} 
            zoom={zoom}
            maxZoom={12} 
            minZoom={1} 
            translateExtent={[[-Infinity, -100], [Infinity, 450]]}
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
                      if (isVisited && viewMode === "yearly" && year) fillColor = getYearlyColor(year);
                      if (isHome) fillColor = "#f1c40f"; // Gold for home country

                      return (
                        <Geography
                          key={`${offset}-${geo.rsmKey}`}
                          geography={geo}
                          onClick={() => onCountryClick(countryId)}
                          onMouseEnter={() => setTooltipContent(`${geo.properties.name}${year ? ` (${year})` : ""}`)}
                          onMouseLeave={() => setTooltipContent("")}
                          style={{
                            default: { fill: fillColor, stroke: "#FFFFFF", strokeWidth: 0.5, outline: "none" },
                            hover: { fill: isVisited ? fillColor : "#F53", fillOpacity: 0.8, stroke: "#FFFFFF", strokeWidth: 0.5, outline: "none", cursor: "pointer" },
                            pressed: { fill: "#E42", outline: "none" }
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
      </div>

      <div className="map-controls-compact">
        <div className="compact-control-group">
          <div className="compact-item center-select">
            <span className="compact-label">Map:</span>
            {isMobile ? (
              <select 
                className="mobile-select-mini" 
                value={mapRegion || ""} 
                onChange={(e) => onRegionChange(e.target.value as any)}
              >
                <option value="asia">Asia</option>
                <option value="europe">EU/AF</option>
                <option value="americas">Americas</option>
              </select>
            ) : (
              <div className="segmented-control-mini">
                <button className={`btn-slim ${mapRegion === 'asia' ? 'active' : ''}`} onClick={() => onRegionChange("asia")}>Asia</button>
                <button className={`btn-slim ${mapRegion === 'europe' ? 'active' : ''}`} onClick={() => onRegionChange("europe")}>EU/ME</button>
                <button className={`btn-slim ${mapRegion === 'americas' ? 'active' : ''}`} onClick={() => onRegionChange("americas")}>Americas</button>
              </div>
            )}
          </div>

          <div className="compact-item mode-toggle">
            <span className="compact-label">Mode:</span>
            <div className="segmented-control-mini">
              <button className={`btn-slim-mini ${viewMode === 'simple' ? 'active' : ''}`} onClick={() => onModeChange("simple")}>Simple</button>
              <button className={`btn-slim-mini ${viewMode === 'yearly' ? 'active' : ''}`} onClick={() => onModeChange("yearly")}>Year</button>
            </div>
          </div>

          {viewMode === "simple" && (
            <div className="compact-item color-item">
              <div className="color-picker-dot-mini">
                <input type="color" value={visitedColor} onChange={(e) => onColorChange(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
