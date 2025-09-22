import { useEffect, useRef } from "react";

export function SplineScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create script element for Spline
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@splinetool/viewer@1.9.48/build/spline-viewer.js";
    
    script.onload = () => {
      if (containerRef.current) {
        // Create spline-viewer element
        const viewer = document.createElement("spline-viewer");
        viewer.setAttribute("url", "https://prod.spline.design/claritystream-H2XMbAwzgCJFmP5MugBJIizs/scene.splinecode");
        viewer.style.width = "100%";
        viewer.style.height = "100%";
        viewer.style.borderRadius = "1.5rem";
        
        // Clear container and add viewer
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(viewer);
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full min-h-[400px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-3xl flex items-center justify-center"
      data-testid="spline-scene-container"
    >
      {/* Fallback content while Spline loads */}
      <div className="animate-float text-center">
        <div className="text-6xl mb-4">🔑</div>
        <div className="text-5xl mx-8">👜</div>
        <div className="text-6xl">🎒</div>
      </div>
    </div>
  );
}
