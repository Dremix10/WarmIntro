"use client";

import { useState, useEffect, useRef } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function GoogleDrivePicker({
  onFilePicked,
  extracting,
}: {
  onFilePicked: (fileId: string, fileName: string, accessToken: string) => void;
  extracting: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!API_KEY || !CLIENT_ID) return;

    async function init() {
      try {
        await loadScript("https://apis.google.com/js/api.js");
        await loadScript("https://accounts.google.com/gsi/client");
        await new Promise<void>((resolve) => window.gapi!.load("picker", resolve));
        setReady(true);
      } catch {
        setError("Failed to load Google APIs");
      }
    }
    init();
  }, []);

  const handleClick = () => {
    if (!ready) return;
    setLoading(true);
    setError(null);

    // Request OAuth token via Google Identity Services
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error || !response.access_token) {
          setError("Google sign-in was cancelled or failed.");
          setLoading(false);
          return;
        }
        tokenRef.current = response.access_token;
        openPicker(response.access_token);
      },
    });

    tokenClient.requestAccessToken();
  };

  const openPicker = (accessToken: string) => {
    const view = new window.google!.picker.PickerBuilder()
      .setDeveloperKey(API_KEY)
      .setOAuthToken(accessToken)
      .addView(
        new window.google!.picker.DocsView()
          .setMimeTypes("application/pdf")
          .setLabel("Your Resume PDFs")
      )
      .setCallback((data: { action: string; docs?: Array<{ id: string; name: string }> }) => {
        if (data.action === "picked" && data.docs?.[0]) {
          const doc = data.docs[0];
          onFilePicked(doc.id, doc.name, accessToken);
        }
        setLoading(false);
      })
      .setTitle("Select your resume")
      .build();

    view.setVisible(true);
  };

  if (!API_KEY || !CLIENT_ID) return null;

  return (
    <div className="space-y-3">
      <button type="button" onClick={handleClick} disabled={loading || !ready || extracting}
        className="w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 px-4 py-10 cursor-pointer transition-colors disabled:opacity-50">
        {loading || extracting ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" />
            <p className="text-sm font-medium text-slate-700">
              {extracting ? "Reading your resume..." : "Opening Google Drive..."}
            </p>
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
            <p className="mt-1 text-xs text-slate-400">Select your resume PDF directly from Drive</p>
          </>
        )}
      </button>
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
}
