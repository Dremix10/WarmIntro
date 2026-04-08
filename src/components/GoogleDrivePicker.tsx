"use client";

import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    google?: {
      picker: {
        PickerBuilder: new () => PickerBuilder;
        ViewId: { DOCS: string };
        Action: { PICKED: string; CANCEL: string };
        Feature: { MULTISELECT_ENABLED: string };
      };
    };
    gapi?: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>;
        getToken: () => { access_token: string } | null;
      };
      auth2?: {
        getAuthInstance: () => {
          signIn: (options: { scope: string }) => Promise<void>;
          isSignedIn: { get: () => boolean };
          currentUser: { get: () => { getAuthResponse: () => { access_token: string } } };
        };
      };
    };
  }

  interface PickerBuilder {
    setOAuthToken: (token: string) => PickerBuilder;
    setDeveloperKey: (key: string) => PickerBuilder;
    addView: (view: unknown) => PickerBuilder;
    setCallback: (callback: (data: PickerResponse) => void) => PickerBuilder;
    build: () => { setVisible: (visible: boolean) => void };
  }

  interface PickerResponse {
    action: string;
    docs?: Array<{
      id: string;
      name: string;
      mimeType: string;
      url: string;
    }>;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function GoogleDrivePicker({
  onFileSelected,
}: {
  onFileSelected: (file: { id: string; name: string; accessToken: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAPIs() {
      try {
        await Promise.all([
          loadScript("https://apis.google.com/js/api.js"),
          loadScript("https://accounts.google.com/gsi/client"),
        ]);
        setScriptsReady(true);
      } catch {
        setError("Failed to load Google APIs");
      }
    }
    loadAPIs();
  }, []);

  const openPicker = useCallback(async () => {
    if (!scriptsReady || !window.google || !API_KEY) return;
    setLoading(true);
    setError(null);

    try {
      // Get an OAuth token via Google Identity Services
      const tokenClient = (window as unknown as {
        google: {
          accounts: {
            oauth2: {
              initTokenClient: (config: {
                client_id: string;
                scope: string;
                callback: (response: { access_token?: string; error?: string }) => void;
              }) => { requestAccessToken: () => void };
            };
          };
        };
      }).google.accounts.oauth2.initTokenClient({
        client_id: "", // Not needed for Picker with API key only
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: () => {},
      });

      // For Picker API with just an API key (no OAuth), we use a simpler approach
      await new Promise<void>((resolve) => {
        window.gapi!.load("picker", resolve);
      });

      const view = new window.google!.picker.PickerBuilder()
        .setDeveloperKey(API_KEY)
        .addView(window.google!.picker.ViewId.DOCS)
        .setCallback((data: PickerResponse) => {
          if (data.action === window.google!.picker.Action.PICKED && data.docs?.[0]) {
            const doc = data.docs[0];
            onFileSelected({ id: doc.id, name: doc.name, accessToken: "" });
          }
        })
        .build();

      view.setVisible(true);
    } catch (err) {
      setError("Could not open Google Drive. Try uploading the PDF directly.");
    } finally {
      setLoading(false);
    }
  }, [scriptsReady, onFileSelected]);

  return (
    <div className="space-y-3">
      <button type="button" onClick={openPicker} disabled={loading || !scriptsReady}
        className="w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 px-4 py-10 cursor-pointer transition-colors disabled:opacity-50">
        {loading ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" />
            <p className="text-sm font-medium text-slate-700">Opening Google Drive...</p>
          </>
        ) : (
          <>
            <svg className="h-10 w-10 mb-3" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 13.6z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            <p className="text-sm font-medium text-slate-700">Browse Google Drive</p>
            <p className="mt-1 text-xs text-slate-400">Select your resume PDF from Drive</p>
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
}
