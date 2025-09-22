export function SplineScene() {
  return (
    <div 
      className="w-full h-full min-h-[400px] bg-gradient-to-b from-blue-500/10 to-transparent rounded-3xl flex items-center justify-center"
      data-testid="spline-scene-container"
    >
      {/* Spline iframe background */}
      <iframe 
        src="https://my.spline.design/claritystream-H2XMbAwzgCJFmP5MugBJIizs/" 
        frameBorder="0" 
        width="100%" 
        height="100%"
      />
    </div>
  );
}
