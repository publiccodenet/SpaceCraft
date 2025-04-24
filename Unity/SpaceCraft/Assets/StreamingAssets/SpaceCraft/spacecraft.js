// Initialize QR codes, Supabase, and event handlers
function initializeQRCodes() {
  console.log("[SpaceCraft] Initializing QR codes");
  
  // QR code defaults
  const qrcodeDefaults = {
      dim: 100,
      pad: 1,
      pal: ['#000','#fff']
  };
  
  // Build absolute URLs to the HTML files
  // In WebGL builds, StreamingAssets is served from the root
  let baseUrl = window.location.origin;
  
  // If there's a path in the URL (other than just "/"), add it
  // This handles cases where the game is hosted in a subdirectory
  const basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
  
  // Build the complete URLs
  const navigatorUrl = `${baseUrl}${basePath}StreamingAssets/SpaceCraft/navigator.html`;
  const selectorUrl = `${baseUrl}${basePath}StreamingAssets/SpaceCraft/selector.html`;
  
  console.log("[SpaceCraft] Navigator URL:", navigatorUrl);
  console.log("[SpaceCraft] Selector URL:", selectorUrl);
  
  // Create navigator QR code
  const navigatorSvg = document.getElementById('navigator');
  if (navigatorSvg) {
    try {
      const navigatorQR = QRCode({
          ...qrcodeDefaults, 
          msg: navigatorUrl
      });
      
      // Replace the empty SVG with the QR code
      navigatorSvg.parentNode.replaceChild(navigatorQR, navigatorSvg);
      navigatorQR.id = 'navigator';
      navigatorQR.className = 'qrcode';
    } catch (error) {
      console.error("[SpaceCraft] Error creating navigator QR code:", error);
    }
  } else {
    console.warn("[SpaceCraft] Navigator SVG element not found");
  }
  
  // Create selector QR code
  const selectorSvg = document.getElementById('selector');
  if (selectorSvg) {
    try {
      const selectorQR = QRCode({
          ...qrcodeDefaults, 
          msg: selectorUrl
      });
      
      // Replace the empty SVG with the QR code
      selectorSvg.parentNode.replaceChild(selectorQR, selectorSvg);
      selectorQR.id = 'selector';
      selectorQR.className = 'qrcode';
    } catch (error) {
      console.error("[SpaceCraft] Error creating selector QR code:", error);
    }
  } else {
    console.warn("[SpaceCraft] Selector SVG element not found");
  }
} 