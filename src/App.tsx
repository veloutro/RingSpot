/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Target, Copy, RefreshCw, Layers, Info, ExternalLink, Settings, X, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CenterIcon = L.divIcon({
  className: 'custom-center-icon',
  html: `<div class="w-8 h-8 bg-blue-500 rounded-full border-4 border-zinc-900 shadow-lg flex items-center justify-center">
           <div class="w-2 h-2 bg-white rounded-full"></div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const PointIcon = L.divIcon({
  className: 'custom-point-icon',
  html: `<div class="w-6 h-6 bg-orange-500 rounded-full border-2 border-zinc-900 shadow-md flex items-center justify-center animate-pulse">
           <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Helper to generate points for a circle (for polygon holes)
const getCirclePoints = (center: [number, number], radiusKm: number, numPoints = 120) => {
  if (radiusKm <= 0) return [];
  const points: [number, number][] = [];
  const [lat0, lon0] = center;
  const r = radiusKm * 1000; // meters
  
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;
    const dx = r * Math.cos(theta);
    const dy = r * Math.sin(theta);
    const dLat = dy / 111320;
    const dLon = dx / (111320 * Math.cos(lat0 * Math.PI / 180));
    points.push([lat0 + dLat, lon0 + dLon]);
  }
  return points;
};

// Component to handle map center updates
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    // Only auto-center on first load or manual reset if needed
  }, [center, map]);
  return null;
}

export default function App() {
  const [center, setCenter] = useState<[number, number]>([55.751244, 37.618423]);
  const [outerRadius, setOuterRadius] = useState<number>(10);
  const [innerRadius, setInnerRadius] = useState<number>(2);
  const [randomPoint, setRandomPoint] = useState<[number, number] | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // New State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSettings, setShowSettings] = useState(false);

  // Apply theme to body
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Ensure inner radius is always <= outer radius
  useEffect(() => {
    if (innerRadius > outerRadius) {
      setInnerRadius(outerRadius);
    }
  }, [outerRadius, innerRadius]);

  const generatePoint = () => {
    const [lat0, lon0] = center;
    const rIn = innerRadius * 1000;
    const rOut = outerRadius * 1000;
    
    const u = Math.random();
    const r = Math.sqrt(u * (rOut * rOut - rIn * rIn) + rIn * rIn);
    const theta = Math.random() * 2 * Math.PI;
    
    const dx = r * Math.cos(theta);
    const dy = r * Math.sin(theta);
    
    const dLat = dy / 111320;
    const dLon = dx / (111320 * Math.cos(lat0 * Math.PI / 180));
    
    const newPoint: [number, number] = [lat0 + dLat, lon0 + dLon];
    setRandomPoint(newPoint);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Ring visualization using a Polygon with a hole
  const ringPolygon = useMemo(() => {
    const outerPoints = getCirclePoints(center, outerRadius);
    const innerPoints = getCirclePoints(center, innerRadius);
    // Leaflet Polygon with holes: [outerBoundary, hole1, hole2, ...]
    if (innerRadius > 0) {
      return [outerPoints, innerPoints.reverse()]; // Reverse inner points for correct winding
    }
    return [outerPoints];
  }, [center, outerRadius, innerRadius]);

  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Header */}
      <header className={`border-b px-6 py-4 flex items-center justify-between z-10 shadow-md transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-3">
          <div className="text-3xl filter drop-shadow-md select-none">
            🎲
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight transition-colors ${theme === 'dark' ? 'text-zinc-50' : 'text-zinc-900'}`}>В неизвестность</h1>
            <p className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Кубик всё решит</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative z-0 min-h-[40vh]">
          <MapContainer 
            center={center} 
            zoom={12} 
            style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={theme === 'dark' 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              }
            />
            
            <MapController center={center} />

            {/* Ring Visualization */}
            <Polygon 
              positions={ringPolygon}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: innerRadius > 0 ? '5, 10' : undefined
              }}
            />

            {/* Outer boundary line for clarity */}
            <Circle 
              center={center} 
              radius={outerRadius * 1000} 
              pathOptions={{ color: '#3b82f6', fill: false, weight: 1, opacity: 0.5 }} 
            />

            {/* Center Draggable Marker */}
            <Marker 
              position={center} 
              draggable={true}
              icon={CenterIcon}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setCenter([position.lat, position.lng]);
                },
              }}
            >
              <Popup className="dark-popup">
                <div className="text-center p-1 bg-zinc-900 text-zinc-100">
                  <p className="font-bold text-blue-400">Центр кольца</p>
                  <p className="text-[10px] text-zinc-400">{center[0].toFixed(6)}, {center[1].toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>

            {/* Generated Point Marker */}
            {randomPoint && (
              <Marker position={randomPoint} icon={PointIcon}>
                <Popup className="dark-popup">
                  <div className="text-center p-1 bg-zinc-900 text-zinc-100">
                    <p className="font-bold text-orange-400">Случайная точка</p>
                    <p className="text-[10px] text-zinc-400">{randomPoint[0].toFixed(6)}, {randomPoint[1].toFixed(6)}</p>
                    <div className="flex flex-col gap-1 mt-2">
                      <button 
                        onClick={() => copyToClipboard(`${randomPoint[0].toFixed(6)}, ${randomPoint[1].toFixed(6)}`)}
                        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded transition-colors flex items-center gap-1 mx-auto"
                      >
                        <Copy className="w-3 h-3" /> Копировать
                      </button>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${randomPoint[0]},${randomPoint[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors flex items-center gap-1 mx-auto"
                      >
                        <ExternalLink className="w-3 h-3" /> Навигация
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Map Overlay Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
            <div className={`backdrop-blur p-3 rounded-2xl shadow-xl border flex flex-col gap-1 transition-colors ${theme === 'dark' ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>Центр</p>
              <p className={`text-xs font-mono ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>{center[0].toFixed(4)}, {center[1].toFixed(4)}</p>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <aside className={`w-full border-t p-6 flex flex-col gap-6 z-10 shadow-2xl overflow-y-auto max-h-[60vh] transition-colors ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  <Layers className="w-4 h-4 text-blue-500" />
                  Параметры кольца
                </h2>
                <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                  Километры
                </div>
              </div>

              {/* Outer Radius */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Внешний радиус</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={outerRadius}
                      onChange={(e) => setOuterRadius(Math.min(250, Math.max(0, Number(e.target.value))))}
                      className={`w-14 text-right text-xs font-mono border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                    />
                    <span className="text-[10px] font-bold text-zinc-600">км</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="250" 
                  step="1"
                  value={outerRadius}
                  onChange={(e) => setOuterRadius(Number(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}
                />
              </div>

              {/* Inner Radius */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Внутренний радиус</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={innerRadius}
                      onChange={(e) => setInnerRadius(Math.min(outerRadius, Math.max(0, Number(e.target.value))))}
                      className={`w-14 text-right text-xs font-mono border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                    />
                    <span className="text-[10px] font-bold text-zinc-600">км</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={outerRadius} 
                  step="1"
                  value={innerRadius}
                  onChange={(e) => setInnerRadius(Number(e.target.value))}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-400 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 justify-center">
              {/* Action Button */}
              <button 
                onClick={generatePoint}
                disabled={outerRadius === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-blue-900/20 transition-all flex items-center justify-center gap-3 group active:scale-95"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Сгенерировать точку
              </button>

              {/* Result Area */}
              <AnimatePresence mode="wait">
                {randomPoint ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`border rounded-2xl p-5 space-y-4 shadow-inner transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-orange-400">
                        <MapPin className="w-4 h-4" />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>Координаты точки</span>
                      </div>
                    </div>
                    
                    <div 
                      onClick={() => copyToClipboard(`${randomPoint[0].toFixed(6)}, ${randomPoint[1].toFixed(6)}`)}
                      className={`rounded-xl p-4 border transition-colors group relative cursor-pointer hover:border-zinc-600 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-sm font-mono font-bold transition-colors ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {randomPoint[0].toFixed(6)}, {randomPoint[1].toFixed(6)}
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase font-bold">
                          Нажмите, чтобы скопировать
                        </span>
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Copy className="w-5 h-5 text-zinc-500" />
                      </div>
                    </div>

                    {randomPoint && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${randomPoint[0]},${randomPoint[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Открыть в навигаторе
                      </a>
                    )}
                  </motion.div>
                ) : (
                  <div className={`h-24 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed rounded-2xl ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <p className="text-zinc-600 text-[10px] font-medium uppercase tracking-widest">Ожидание генерации</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </aside>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>Настройки</h3>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-500/5 border border-zinc-500/10">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-orange-400" />}
                      <div>
                        <p className={`text-sm font-bold ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>Тема оформления</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">{theme === 'dark' ? 'Темная' : 'Светлая'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-zinc-200'}`}
                    >
                      <motion.div 
                        animate={{ x: theme === 'dark' ? 26 : 4 }}
                        className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm"
                      />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl transition-all"
                >
                  Готово
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {copySuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-100 text-zinc-900 px-6 py-3 rounded-full shadow-2xl z-[2000] flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold">Координаты скопированы!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
