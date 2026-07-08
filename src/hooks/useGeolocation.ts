import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    // IIFE async → le setState de garde (« géoloc non supportée ») n'est pas
    // synchrone dans le corps de l'effet (react-hooks/set-state-in-effect,
    // cf. #179/#193). getCurrentPosition passe déjà par des callbacks.
    void (async () => {
      if (!navigator.geolocation) {
        setState({ latitude: null, longitude: null, error: 'Geolocation not supported', loading: false });
        return;
      }

      navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState({ latitude: null, longitude: null, error: error.message, loading: false });
      },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      );
    })();
  }, []);

  return state;
}