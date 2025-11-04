export function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve(window.google.maps);
    }

    script.onerror = (error) => {
      reject(error);
    }

    document.head.appendChild(script);
  })
}