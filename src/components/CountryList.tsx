import { useState, useMemo } from "react";
import type { FC } from "react";
import type { Country } from "../data/countries";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableCountryCard: FC<{
  country: Country;
  code2: string;
  onRemove: () => void;
  isDragging?: boolean;
}> = ({ country, code2, onRemove, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: country.numeric });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none' // Essential for mobile DND
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`timeline-country-card-mini ${isDragging ? 'dragging' : ''}`}>
      <div className="card-content-mini">
        <img src={`https://flagcdn.com/w20/${code2.toLowerCase()}.png`} alt="" className="country-flag-mini" />
        <span className="country-name-mini">{country.name}</span>
      </div>
      <button className="btn-remove-card-mini" onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
    </div>
  );
};

interface CountryListProps {
  countries: Country[];
  visitedCountries: Set<string>;
  visitedData: Record<string, string[]>;
  visitedOrder: string[];
  onToggle: (countryCode: string) => void;
  onYearsChange: (numericId: string, years: string[]) => void;
  onReorder: (newOrder: string[]) => void;
  yearlyColors: Record<string, string>;
  onYearlyColorChange: (year: string, color: string) => void;
}

const CountryList: FC<CountryListProps> = ({ 
  countries, visitedCountries, visitedData, visitedOrder, onToggle, onYearsChange, onReorder, yearlyColors, onYearlyColorChange
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [listMode, setListMode] = useState<"region" | "year" | "data">("region");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);

  const currentYear = new Date().getFullYear();
  const yearsOptions = useMemo(() => Array.from({ length: currentYear - 1950 + 1 }, (_, i) => String(currentYear - i)), [currentYear]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredCountries = countries.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const getCountryByNumeric = (id: string) => countries.find(c => c.numeric === id);

  const sortedYears = useMemo(() => {
    const yearsSet = new Set<string>();
    visitedOrder.forEach(id => {
      const years = visitedData[id];
      if (years) years.forEach(y => yearsSet.add(y));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [visitedOrder, visitedData]);

  const countriesByYear = useMemo(() => {
    const groups: Record<string, Country[]> = {};
    visitedOrder.forEach(id => {
      const country = getCountryByNumeric(id);
      if (country && visitedCountries.has(country.code)) {
        const years = visitedData[id] || ["Unknown"];
        years.forEach(year => {
          if (!groups[year]) groups[year] = [];
          groups[year].push(country);
        });
      }
    });
    return groups;
  }, [visitedOrder, visitedData, visitedCountries]);

  // Statistics calculations
  const stats = useMemo(() => {
    const regionalData: Record<string, number> = {};
    const yearlyCounts: Record<string, number> = {};
    let totalVisits = 0;
    const uniqueVisited = Object.keys(visitedData);

    uniqueVisited.forEach(id => {
      const country = getCountryByNumeric(id);
      const years = visitedData[id];
      if (country && years) {
        regionalData[country.region] = (regionalData[country.region] || 0) + 1;
        years.forEach(y => {
          yearlyCounts[y] = (yearlyCounts[y] || 0) + 1;
          totalVisits++;
        });
      }
    });

    const mostVisitedYear = Object.entries(yearlyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const regionEntries = Object.entries(regionalData).sort((a, b) => b[1] - a[1]);
    
    return { regionalData: regionEntries, totalCountries: uniqueVisited.length, totalVisits, mostVisitedYear, yearlyCounts };
  }, [visitedData, countries]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const aId = active.id as string;
    const oId = over.id as string;
    if (aId === oId) return;
    const aYears = visitedData[aId];
    let oYear = "";
    if (oId.length > 3) oYear = oId;
    else if (visitedData[oId]) oYear = visitedData[oId][0];

    if (aYears && oYear && !aYears.includes(oYear)) {
      onYearsChange(aId, [oYear, ...aYears.filter(y => y !== oYear)]);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = visitedOrder.indexOf(active.id as string);
      const newIndex = visitedOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) onReorder(arrayMove(visitedOrder, oldIndex, newIndex));
    }
    setActiveId(null);
  };

  const defaultYearlyColors = ["#e74c3c", "#3498db", "#9b59b6", "#f1c40f", "#1abc9c", "#e67e22", "#34495e", "#d35400", "#27ae60", "#ff69b4"];
  const getYearLabelColor = (year: string) => yearlyColors[year] || defaultYearlyColors[parseInt(year) % 10];

  const handleAddYear = (numericId: string) => {
    const currentYears = visitedData[numericId] || [];
    onYearsChange(numericId, [...currentYears, String(currentYear)]);
  };

  const handleRemoveYear = (numericId: string, index: number) => {
    const currentYears = visitedData[numericId] || [];
    const nextYears = currentYears.filter((_, i) => i !== index);
    if (nextYears.length === 0) onToggle(getCountryByNumeric(numericId)?.code || "");
    else onYearsChange(numericId, nextYears);
  };

  const handleYearValueChange = (numericId: string, index: number, value: string) => {
    const currentYears = [...(visitedData[numericId] || [])];
    currentYears[index] = value;
    onYearsChange(numericId, currentYears);
  };

  // Pie Chart Helper
  const renderPieChart = () => {
    const total = stats.totalCountries;
    if (total === 0) return null;

    let cumulativePercentage = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return (
      <svg width="200" height="200" viewBox="0 0 200 200" className="stats-pie-chart">
        <circle cx={centerX} cy={centerY} r={radius} fill="#f0f0f0" />
        {stats.regionalData.map(([region, count], i) => {
          const percentage = count / total;
          const startAngle = cumulativePercentage * 2 * Math.PI;
          cumulativePercentage += percentage;
          const endAngle = cumulativePercentage * 2 * Math.PI;

          const x1 = centerX + radius * Math.sin(startAngle);
          const y1 = centerY - radius * Math.cos(startAngle);
          const x2 = centerX + radius * Math.sin(endAngle);
          const y2 = centerY - radius * Math.cos(endAngle);

          const largeArcFlag = percentage > 0.5 ? 1 : 0;
          const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          
          const colors = ["#3498db", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];
          return <path key={region} d={pathData} fill={colors[i % colors.length]} stroke="white" strokeWidth="1" />;
        })}
        <circle cx={centerX} cy={centerY} r={50} fill="white" />
        <text x={centerX} y={centerY} textAnchor="middle" dy="0.3em" className="pie-center-text" fill="#2c3e50">
          {total}
        </text>
        <text x={centerX} y={centerY + 18} textAnchor="middle" className="pie-center-subtext" fill="#95a5a6">
          Countries
        </text>
      </svg>
    );
  };

  return (
    <div className="country-list-section">
      {editingCountry && (
        <div className="modal-overlay" onClick={() => setEditingCountry(null)}>
          <div className="modal-card edit-years-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setEditingCountry(null)}>✕</button>
            <div className="edit-modal-header">
              <img src={`https://flagcdn.com/w80/${editingCountry.code2.toLowerCase()}.png`} alt="" className="modal-country-flag" />
              <h3>{editingCountry.name}</h3>
              <p className="modal-subtitle">Add or edit your travel history to this country.</p>
            </div>
            
            <div className="edit-years-list">
              {(visitedData[editingCountry.numeric] || []).map((year, index) => (
                <div key={index} className="edit-year-row">
                  <span className="visit-count">Visit #{index + 1}</span>
                  <select 
                    value={year} 
                    onChange={(e) => handleYearValueChange(editingCountry.numeric, index, e.target.value)}
                    className="modal-year-select"
                  >
                    {yearsOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <button className="btn-remove-year" onClick={() => handleRemoveYear(editingCountry.numeric, index)}>✕</button>
                </div>
              ))}
              <button className="btn-add-year" onClick={() => handleAddYear(editingCountry.numeric)}>
                <span className="plus-icon">+</span> Add another visit
              </button>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setEditingCountry(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="list-toolbar">
        <div className="search-container">
          <input type="text" placeholder="Search country..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
        </div>
        <div className="list-mode-toggle">
          <button className={`btn-list-mode ${listMode === 'region' ? 'active' : ''}`} onClick={() => setListMode("region")}>
            <span className="mode-icon">🌍</span> Region
          </button>
          <button className={`btn-list-mode ${listMode === 'year' ? 'active' : ''}`} onClick={() => setListMode("year")}>
            <span className="mode-icon">⏳</span> Year
          </button>
          <button className={`btn-list-mode ${listMode === 'data' ? 'active' : ''}`} onClick={() => setListMode("data")}>
            <span className="mode-icon">📊</span> Data
          </button>
        </div>
      </div>

      <div className="country-list-grouped">
        {listMode === "region" && (
          Array.from(new Set(countries.map(c => c.region))).sort().map(region => {
            const countriesInRegion = filteredCountries.filter(c => c.region === region);
            const totalInRegion = countries.filter(c => c.region === region);
            const visitedInRegion = totalInRegion.filter(c => visitedCountries.has(c.code));
            const percentage = totalInRegion.length > 0 ? Math.round((visitedInRegion.length / totalInRegion.length) * 100) : 0;
            
            if (countriesInRegion.length === 0) return null;
            return (
              <div key={region} className="region-group">
                <div className="region-header-stats">
                  <h3 className="region-title">{region}</h3>
                  <div className="region-progress-wrapper">
                    <div className="region-progress-bar">
                      <div className="region-progress-fill" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="region-stats-text">
                      {visitedInRegion.length}/{totalInRegion.length} <span className="region-percentage">({percentage}%)</span>
                    </span>
                  </div>
                </div>
                <div className="country-grid">
                  {countriesInRegion.map(country => {
                    const isVisited = visitedCountries.has(country.code);
                    const years = visitedData[country.numeric] || [];
                    return (
                      <div key={country.code} className={`country-selection-card ${isVisited ? 'visited' : ''}`} onClick={() => isVisited ? setEditingCountry(country) : onToggle(country.code)}>
                        <div className="selection-card-content">
                          <div className="selection-card-header">
                            <img src={`https://flagcdn.com/w40/${country.code2.toLowerCase()}.png`} alt="" className="country-flag" />
                            <span className="country-name">{country.name}</span>
                          </div>
                          {isVisited && (
                            <div className="selection-card-footer">
                              <div className="visit-badge">{years.length} {years.length === 1 ? 'visit' : 'visits'}</div>
                              <div className="year-preview">{years[0]}{years.length > 1 ? '...' : ''}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {listMode === "year" && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="timeline-container">
              {sortedYears.map(year => (
                <div key={year} className="timeline-year-block">
                  <div className="timeline-year-label-group">
                    <div className="timeline-year-label" style={{ color: getYearLabelColor(year) }}><span>{year}</span></div>
                    <div className="year-stats-badge">{countriesByYear[year]?.length || 0} {countriesByYear[year]?.length === 1 ? 'country' : 'countries'}</div>
                    <div className="year-color-picker-wrapper">
                      <input type="color" value={getYearLabelColor(year)} onChange={(e) => onYearlyColorChange(year, e.target.value)} className="year-color-picker" />
                    </div>
                  </div>
                  <div className="timeline-countries">
                    <SortableContext items={countriesByYear[year]?.map(c => c.numeric) || []} strategy={rectSortingStrategy}>
                      {countriesByYear[year]?.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(country => (
                        <SortableCountryCard key={`${year}-${country.code}`} country={country} code2={country.code2} onRemove={() => onToggle(country.code)} />
                      ))}
                    </SortableContext>
                  </div>
                </div>
              ))}
            </div>
          </DndContext>
        )}

        {listMode === "data" && (
          <div className="stats-view-container">
            <div className="stats-top-row">
              <div className="stats-card highlight">
                <div className="stats-card-icon">🗺️</div>
                <div className="stats-card-content">
                  <span className="stats-label">Countries Visited</span>
                  <span className="stats-value">{stats.totalCountries}</span>
                </div>
              </div>
              <div className="stats-card highlight">
                <div className="stats-card-icon">✈️</div>
                <div className="stats-card-content">
                  <span className="stats-label">Total Visits</span>
                  <span className="stats-value">{stats.totalVisits}</span>
                </div>
              </div>
              <div className="stats-card highlight">
                <div className="stats-card-icon">🔥</div>
                <div className="stats-card-content">
                  <span className="stats-label">Most Active Year</span>
                  <span className="stats-value">{stats.mostVisitedYear}</span>
                </div>
              </div>
            </div>

            <div className="stats-middle-row">
              <div className="stats-main-card pie-section">
                <h3>Regional Breakdown</h3>
                <div className="pie-chart-wrapper">
                  {renderPieChart()}
                  <div className="pie-legend">
                    {stats.regionalData.map(([region, count], i) => {
                      const colors = ["#3498db", "#e74c3c", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];
                      return (
                        <div key={region} className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: colors[i % colors.length] }} />
                          <span className="legend-label">{region}</span>
                          <span className="legend-value">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="stats-main-card timeline-mini-chart">
                <h3>Visit History (by Year)</h3>
                <div className="mini-bar-chart">
                  {Object.entries(stats.yearlyCounts).sort((a,b) => a[0].localeCompare(b[0])).map(([year, count]) => {
                    const max = Math.max(...Object.values(stats.yearlyCounts));
                    const height = (count / max) * 100;
                    // Slightly more vibrant color for higher counts
                    const opacity = 0.4 + (count / max) * 0.6;
                    return (
                      <div key={year} className="bar-wrapper">
                        <div className="bar-label-top" style={{ opacity }}>{count}</div>
                        <div 
                          className="bar-fill" 
                          style={{ height: `${height}%`, opacity }} 
                          title={`${year}: ${count} visits`} 
                        />
                        <div className="bar-year">{year}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="chart-footer">Full timeline of your travel activity</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryList;
