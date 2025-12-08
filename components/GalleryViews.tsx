import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Post } from '../types';

interface GalleryViewProps {
  posts: Post[];
  mode: 'spiral' | 'tree' | 'kaleidoscope';
}

// --- Background Decorations ---

const FloatingHearts = () => {
  // Generate random hearts
  const hearts = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${10 + Math.random() * 10}s`,
      animationDelay: `${Math.random() * 5}s`,
      size: `${10 + Math.random() * 20}px`,
      color: Math.random() > 0.7 ? '#ef4444' : '#fca5a5' // Red or Light Red
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="heart-bg"
          style={{
            left: h.left,
            width: h.size,
            height: h.size,
            animationDuration: h.animationDuration,
            animationDelay: h.animationDelay,
            color: h.color
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
             <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}
    </div>
  );
};

const StarField = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: `${Math.random() * 2}s`
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {stars.map(s => (
        <div 
          key={s.id}
          className="absolute rounded-full bg-yellow-200 star-twinkle shadow-[0_0_5px_rgba(253,230,138,0.8)]"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: s.delay
          }}
        />
      ))}
    </div>
  );
};

// --- Main Component ---

export const GalleryViews: React.FC<GalleryViewProps> = ({ posts, mode }) => {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const requestRef = useRef<number>(0);
  const [time, setTime] = useState(0);

  // Smooth loop
  const animate = () => {
    setRotation(prev => prev + 0.1); // Slow, continuous increment
    setTime(prev => prev + 0.005);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseFloat(e.target.value));
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#FFF8E1] to-[#FFF0B5] select-none perspective-container">
      <FloatingHearts />
      <StarField />
      
      {/* Controls */}
      <div className="absolute bottom-24 md:bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-4 bg-white/60 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-amber-200/50">
        <span className="text-xs font-bold text-amber-900 uppercase">Size</span>
        <input 
          type="range" 
          min="0.5" 
          max="2.5" 
          step="0.1" 
          value={zoom} 
          onChange={handleZoomChange}
          className="w-32 accent-amber-500 cursor-pointer"
        />
      </div>

      <div className="w-full h-full flex items-center justify-center relative z-10">
        {mode === 'spiral' && <RingsView posts={posts} rotation={rotation} zoom={zoom} />}
        {mode === 'tree' && <ChristmasTreeView posts={posts} rotation={rotation} zoom={zoom} />}
        {mode === 'kaleidoscope' && <BloomingView posts={posts} time={time} zoom={zoom} />}
      </div>

      <style>{`
        .perspective-container {
          perspective: 1200px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-visible {
          backface-visibility: visible;
        }
      `}</style>
    </div>
  );
};

// --- View 1: Concentric Rings (Spiral Replacement) ---
// "Horizontal rotation, ring stacked on ring in reverse direction"
const RingsView: React.FC<{ posts: Post[]; rotation: number; zoom: number }> = ({ posts, rotation, zoom }) => {
  // Organize posts into concentric rings
  const rings = useMemo(() => {
    const r = [];
    let idx = 0;
    let ringNum = 1;
    while (idx < posts.length) {
      const capacity = Math.max(5, ringNum * 4);
      r.push(posts.slice(idx, idx + capacity));
      idx += capacity;
      ringNum++;
    }
    return r;
  }, [posts]);

  return (
    <div 
      className="relative preserve-3d transition-transform duration-300 ease-out will-change-transform"
      style={{ 
        transform: `scale(${zoom}) rotateX(60deg) rotateZ(0deg)`, // Tilted like a galaxy/saturn rings
        width: '0px',
        height: '0px'
      }}
    >
      {rings.map((ringPosts, ringIndex) => {
        const radius = 200 + (ringIndex * 140);
        // Even rings rotate CW, Odd rings rotate CCW
        const direction = ringIndex % 2 === 0 ? 1 : -1;
        const currentRotation = rotation * 2 * direction; 

        return (
          <div 
            key={ringIndex} 
            className="absolute top-0 left-0 preserve-3d"
            style={{ transform: `rotateZ(${currentRotation}deg)` }}
          >
             {/* Ring Line */}
             <div 
               className="absolute top-1/2 left-1/2 border border-amber-400/30 rounded-full"
               style={{ 
                 width: `${radius * 2}px`, 
                 height: `${radius * 2}px`,
                 transform: `translate(-50%, -50%)`
               }} 
             />

             {ringPosts.map((post, i) => {
                const angle = (360 / ringPosts.length) * i;
                const rad = angle * (Math.PI / 180);
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;

                return (
                  <div
                    key={post.id}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `translate(${x}px, ${y}px) rotateZ(${angle + 90}deg) rotateX(-90deg)`, // Stand pictures up on the ring
                    }}
                  >
                    <div className="w-24 h-24 p-1 bg-white shadow-lg rounded-lg border-2 border-amber-100 flex flex-col items-center">
                       <img src={post.imageUrl || post.image.previewUrl} className="w-full h-16 object-cover rounded" />
                       <div className="w-0.5 h-6 bg-amber-300/50 mt-1"></div>
                    </div>
                  </div>
                );
             })}
          </div>
        );
      })}
    </div>
  );
};

// --- View 2: Enhanced Christmas Tree ---
const ChristmasTreeView: React.FC<{ posts: Post[]; rotation: number; zoom: number }> = ({ posts, rotation, zoom }) => {
  // Layer logic
  const layers = useMemo(() => {
    const l = [];
    let idx = 0;
    let level = 1;
    while (idx < posts.length) {
      const capacity = Math.max(3, level * 2 + 1);
      l.push(posts.slice(idx, idx + capacity));
      idx += capacity;
      level++;
    }
    return l;
  }, [posts]);

  return (
    <div 
      className="relative preserve-3d transition-transform duration-300 ease-out"
      style={{ 
        transform: `scale(${zoom}) rotateY(${rotation * 3}deg)`,
        width: '0px',
        height: '0px'
      }}
    >
      {/* Central Pole */}
      <div className="absolute top-1/2 left-1/2 w-2 h-[600px] bg-amber-800/20 transform -translate-x-1/2 -translate-y-1/2 blur-sm"></div>

      {layers.map((layerPosts, layerIndex) => {
        const y = -250 + (layerIndex * 100);
        const radius = 60 + (layerIndex * 50);
        
        return (
          <div key={layerIndex} className="preserve-3d absolute inset-0">
            {/* Tinsel Line for this layer */}
             <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none opacity-30" style={{ transform: `translateY(${y}px)` }}>
                <circle cx="0" cy="0" r={radius} fill="none" stroke="gold" strokeWidth="1" strokeDasharray="5,5" />
             </svg>

            {layerPosts.map((post, i) => {
              const angle = (360 / layerPosts.length) * i;
              
              return (
                <div
                  key={post.id}
                  className="absolute top-1/2 left-1/2 shadow-xl bg-white p-1 rounded-lg backface-visible group"
                  style={{
                    width: '80px',
                    height: '80px',
                    marginLeft: '-40px',
                    marginTop: '-40px',
                    transform: `translateY(${y}px) rotateY(${angle}deg) translateZ(${radius}px)`,
                  }}
                >
                  <img src={post.imageUrl || post.image.previewUrl} className="w-full h-full object-cover rounded" />
                  {/* Hanging String */}
                  <div className="absolute -top-10 left-1/2 w-0.5 h-10 bg-yellow-400/50"></div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Top Star */}
      <div 
        className="absolute top-0 left-0 text-yellow-400 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]"
        style={{ transform: `translate(-50%, -350px) rotateY(${-rotation * 3}deg)` }} // Counter rotate to face camera? Or just let it spin
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
  );
};

// --- View 3: Blooming Kaleidoscope (Tunnel) ---
// "Auto expand from inside out"
const BloomingView: React.FC<{ posts: Post[]; time: number; zoom: number }> = ({ posts, time, zoom }) => {
  const displayPosts = posts.length > 0 ? posts : [];
  
  // We repeat the posts to create an infinite flow feel
  const repeatedPosts = useMemo(() => {
    if (displayPosts.length === 0) return [];
    // Ensure we have enough items
    let items = [...displayPosts];
    while(items.length < 20) {
      items = [...items, ...displayPosts];
    }
    return items.slice(0, 30); // Max items
  }, [displayPosts]);

  return (
    <div 
      className="relative preserve-3d"
      style={{ 
        transform: `scale(${zoom * 1.5}) rotateZ(${time * 20}deg)`, // Slight overall rotation
        width: '0px',
        height: '0px'
      }}
    >
      {repeatedPosts.map((post, i) => {
        // Animation logic:
        // Distance from center (r) depends on time.
        // It should go from 0 to MAX_RADIUS, then loop back to 0.
        // Staggered by index.
        
        const loopDuration = 1; // logical time units
        const stagger = 0.05;
        const rawProgress = (time * 0.2 + (i * stagger)) % loopDuration;
        
        // Use non-linear easing for "bloom" effect (fast start, slow end or vice versa)
        const progress = rawProgress;
        
        const radius = progress * 400; // Max radius
        const scale = 0.2 + (progress * 1.5); // Grow as it comes out
        const opacity = 1 - Math.pow(progress, 3); // Fade out at the edge
        
        // Hexagonal or Octagonal symmetry angle
        const symmetry = 6;
        const angleOffset = (i % symmetry) * (360 / symmetry);
        
        return (
          <div
            key={`${post.id}-${i}`}
            className="absolute top-1/2 left-1/2 border border-white/50 rounded-full overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            style={{
              width: '80px',
              height: '80px',
              marginLeft: '-40px',
              marginTop: '-40px',
              transform: `rotateZ(${angleOffset}deg) translateX(${radius}px) rotateZ(-${angleOffset}deg) scale(${scale})`,
              opacity: opacity,
              zIndex: Math.floor((1 - progress) * 100)
            }}
          >
             <img src={post.imageUrl || post.image.previewUrl} className="w-full h-full object-cover" />
             {/* Connecting line to center */}
             <div className="absolute top-1/2 right-full w-[200px] h-[1px] bg-gradient-to-r from-transparent to-amber-200/50 origin-right transform rotate-180"></div>
          </div>
        );
      })}
      
      {/* Center Core */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-amber-100 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.8)] animate-pulse z-50"></div>
    </div>
  );
};