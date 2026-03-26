import { useState, useEffect, useMemo } from "react";
import "./App.css";
import { countries } from "./data/countries";
import WorldMap from "./components/WorldMap";
import CountryList from "./components/CountryList";
import ProgressBar from "./components/ProgressBar";
import { QRCodeSVG } from "qrcode.react";

type VisitedData = Record<string, string[]>; // Changed to string[] for multiple visits
type YearlyColors = Record<string, string>;
type MapRegion = "asia" | "europe" | "americas" | null;

function App() {
  const currentYearString = String(new Date().getFullYear());

  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("m");
    if (mode === "view") setIsReadOnly(true);
    if (mode === "ss") setIsFullScreen(true);
  }, []);

  const [visitedData, setVisitedData] = useState<VisitedData>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get("v");
      
      if (v) {
        const decoded: VisitedData = {};
        // Decode from Base64 binary format
        const binaryString = atob(v.replace(/-/g, "+").replace(/_/g, "/"));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

        let ptr = 0;
        while (ptr < bytes.length) {
          const countryIdx = bytes[ptr++];
          const visitCount = bytes[ptr++];
          const country = countries[countryIdx];
          if (country) {
            const years: string[] = [];
            for (let j = 0; j < visitCount; j++) {
              const yy = bytes[ptr++];
              years.push(yy > 50 ? `19${yy}` : `20${yy}`);
            }
            decoded[country.numeric] = years;
          }
        }
        return decoded;
      }

      const saved = localStorage.getItem("visitedData");
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const migrated: VisitedData = {};
      Object.entries(parsed).forEach(([id, value]) => {
        if (Array.isArray(value)) migrated[id] = value;
        else if (typeof value === "string") migrated[id] = [value];
      });
      return migrated;
    } catch (e) {
      return {};
    }
  });

  const [visitedOrder, setVisitedOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("visitedOrder");
    if (saved) return JSON.parse(saved);
    return Object.keys(visitedData);
  });

  const [homeCountry, setHomeCountry] = useState<string | null>(() => {
    return localStorage.getItem("homeCountry") || null;
  });

  const [mapRegion, setMapRegion] = useState<MapRegion>(() => {
    return (localStorage.getItem("mapRegion") as MapRegion) || null;
  });

  const [visitedColor, setVisitedColor] = useState<string>(() => {
    return localStorage.getItem("visitedColor") || "#3498db";
  });

  const [yearlyColors, setYearlyColors] = useState<YearlyColors>(() => {
    const saved = localStorage.getItem("yearlyColors");
    return saved ? JSON.parse(saved) : {};
  });
  
  const [viewMode, setViewMode] = useState<"simple" | "yearly">("simple");
  const [showQR, setShowQR] = useState(false);
  const [copyCount, setCopyCount] = useState<number>(() => {
    return parseInt(localStorage.getItem("copyCount") || "0");
  });
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    localStorage.setItem("visitedData", JSON.stringify(visitedData));
    const currentOrder = visitedOrder.filter(id => !!visitedData[id]);
    const missingIds = Object.keys(visitedData).filter(id => !visitedOrder.includes(id));
    const newOrder = [...currentOrder, ...missingIds];
    localStorage.setItem("visitedOrder", JSON.stringify(newOrder));
  }, [visitedData, visitedOrder]);

  useEffect(() => {
    localStorage.setItem("visitedColor", visitedColor);
  }, [visitedColor]);

  useEffect(() => {
    localStorage.setItem("yearlyColors", JSON.stringify(yearlyColors));
  }, [yearlyColors]);

  useEffect(() => {
    if (mapRegion) localStorage.setItem("mapRegion", mapRegion);
  }, [mapRegion]);

  useEffect(() => {
    if (homeCountry) localStorage.setItem("homeCountry", homeCountry);
  }, [homeCountry]);

  useEffect(() => {
    localStorage.setItem("copyCount", copyCount.toString());
  }, [copyCount]);

  const handleSelectHome = (numericId: string) => {
    const country = countries.find(c => c.numeric === numericId);
    if (!country) return;
    setHomeCountry(numericId);
    // Auto-set region based on home country
    if (country.region.includes("Asia") || country.region.includes("Oceania")) setMapRegion("asia");
    else if (country.region.includes("Europe") || country.region.includes("Africa")) setMapRegion("europe");
    else setMapRegion("americas");
  };

  const handleToggleCountry = (id: string) => {
    setVisitedData((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        setVisitedOrder(order => order.filter(oid => oid !== id));
      } else {
        next[id] = [currentYearString];
        setVisitedOrder(order => [id, ...order]);
      }
      return { ...next };
    });
  };

  const handleUpdateYears = (id: string, years: string[]) => {
    setVisitedData((prev) => ({ ...prev, [id]: years }));
  };

  const handleUpdateYearlyColor = (year: string, color: string) => {
    setYearlyColors(prev => ({ ...prev, [year]: color }));
  };

  const handleReorder = (newOrder: string[]) => {
    setVisitedOrder(newOrder);
  };

  const handleListToggle = (alpha3: string) => {
    const country = countries.find(c => c.code === alpha3);
    if (country) handleToggleCountry(country.numeric);
  };

  const visitedAlpha3Codes = useMemo(() => {
    const set = new Set<string>();
    Object.keys(visitedData).forEach(id => {
      const country = countries.find(c => c.numeric === id);
      if (country) set.add(country.code);
    });
    return set;
  }, [visitedData]);

  // Stats for Progress Bar (Yearly Breakdown)
  const visitedStats = useMemo(() => {
    const stats: Record<string, number> = {};
    Object.values(visitedData).forEach(years => {
      years.forEach(year => {
        stats[year] = (stats[year] || 0) + 1;
      });
    });
    return stats;
  }, [visitedData]);

  const shareUrl = useMemo(() => {
    const bytes: number[] = [];
    Object.entries(visitedData).forEach(([id, years]) => {
      const idx = countries.findIndex(c => c.numeric === id);
      if (idx !== -1) {
        bytes.push(idx);
        bytes.push(years.length);
        years.forEach(y => bytes.push(parseInt(y.slice(-2))));
      }
    });
    const binary = String.fromCharCode(...bytes);
    const base64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return {
      view: `${baseUrl}?v=${base64}&m=view`,
      migrate: `${baseUrl}?v=${base64}`,
      screenshot: `${baseUrl}?v=${base64}&m=ss`
    };
  }, [visitedData]);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopyCount(prev => prev + 1);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const visitedCount = Object.keys(visitedData).length;
  const totalCount = countries.length;

  return (
    <div className={`app-container ${isReadOnly ? 'mode-readonly' : ''} ${isFullScreen ? 'mode-fullscreen' : ''}`}>
      {isReadOnly && (
        <div className="readonly-banner">
          <span>Viewing shared journey. Changes will not be saved.</span>
          <button className="btn-exit-readonly" onClick={() => window.location.href = window.location.origin + window.location.pathname}>Create My Own</button>
        </div>
      )}

      {!homeCountry && !isReadOnly && (
        <div className="onboarding-overlay">
          <div className="onboarding-modal">
            <div className="onboarding-header">
              <h2>Welcome to Country Counter</h2>
              <p>Where are you from?</p>
            </div>
            <div className="home-country-picker">
              <select 
                className="onboarding-select" 
                onChange={(e) => handleSelectHome(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Select your home country...</option>
                {countries.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                  <option key={c.numeric} value={c.numeric}>{c.name}</option>
                ))}
              </select>
            </div>
            <p className="onboarding-footer-note">This will be your base on the map.</p>
          </div>
        </div>
      )}

      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal-card share-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowQR(false)}>✕</button>
            <h3>Share Your Journey</h3>
            <p className="modal-subtitle">Generate links to share or migrate your data.</p>
            <div className="qr-wrapper"><QRCodeSVG value={shareUrl.view} size={180} /></div>
            
            <div className="share-section">
              <div className="share-option">
                <div className="share-option-info">
                  <h4>Public Share Link</h4>
                  <p>View-only mode for friends and social media.</p>
                </div>
                <button className={`btn-primary btn-copy-link ${copyFeedback ? 'copied' : ''}`} onClick={() => handleCopyLink(shareUrl.view)}>
                  {copyFeedback ? "✓ Copied" : "Copy Link"}
                </button>
              </div>

              <div className="share-option migration">
                <div className="share-option-info">
                  <h4>Data Migration Link</h4>
                  <p>Full access to edit. Use this for your other devices.</p>
                </div>
                <button className="btn-secondary btn-copy-link" onClick={() => handleCopyLink(shareUrl.migrate)}>
                  Copy Link
                </button>
              </div>
            </div>

            <div className="share-actions-footer">
              <div className="share-meta">Shared <span className="highlight">{copyCount}</span> times</div>
            </div>
          </div>
        </div>
      )}

      {!isFullScreen && (
        <header className="app-navbar">
          <div className="nav-content">
            <div className="nav-left"><h1 className="nav-title">CountryCounter</h1></div>
            <div className="nav-center">
              <ProgressBar 
                visitedCount={visitedCount} 
                totalCount={totalCount} 
                color={visitedColor} 
                isYearly={viewMode === "yearly"}
                stats={visitedStats}
                yearlyColors={yearlyColors}
              />
            </div>
            <div className="nav-right">
              <button className="btn-glass" onClick={() => setShowQR(true)}><span>Share Journey</span></button>
            </div>
          </div>
        </header>
      )}

      <main className="main-content">
        <section className="section-map">
          <WorldMap 
            visitedCountries={new Set(Object.keys(visitedData))} 
            onCountryClick={isReadOnly ? () => {} : handleToggleCountry} 
            visitedColor={visitedColor}
            visitedData={visitedData}
            viewMode={viewMode}
            onColorChange={(color) => setVisitedColor(color)}
            onModeChange={(mode) => setViewMode(mode)}
            yearlyColors={yearlyColors}
            homeCountry={homeCountry}
            readOnly={isReadOnly}
            isFullScreen={isFullScreen}
            screenshotUrl={shareUrl.screenshot}
          />
        </section>

        {!isFullScreen && (
          <section className="section-list">
            <CountryList 
              countries={countries} 
              visitedCountries={visitedAlpha3Codes} 
              visitedData={visitedData} 
              visitedOrder={visitedOrder} 
              onToggle={handleListToggle} 
              onYearsChange={handleUpdateYears} 
              onReorder={handleReorder} 
              yearlyColors={yearlyColors} 
              onYearlyColorChange={handleUpdateYearlyColor} 
              homeCountry={homeCountry}
              readOnly={isReadOnly}
            />
          </section>
        )}
      </main>

      {!isFullScreen && (
        <div className="mobile-progress-floating">
          <ProgressBar 
            visitedCount={visitedCount} 
            totalCount={totalCount} 
            color={visitedColor} 
            isYearly={viewMode === "yearly"}
            stats={visitedStats}
            yearlyColors={yearlyColors}
          />
        </div>
      )}

      {!isFullScreen && <footer className="app-footer"><p>© 2026 Country Counter • Crafted for travelers</p></footer>}
    </div>
  );
}

export default App;
