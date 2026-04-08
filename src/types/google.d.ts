/* eslint-disable @typescript-eslint/no-explicit-any */

interface Window {
  gapi?: {
    load: (api: string, callback: () => void) => void;
  };
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: { access_token?: string; error?: string }) => void;
        }) => { requestAccessToken: () => void };
      };
    };
    picker: {
      PickerBuilder: new () => GooglePickerBuilder;
      DocsView: new () => GoogleDocsView;
      Action: { PICKED: string; CANCEL: string };
    };
  };
}

interface GooglePickerBuilder {
  setDeveloperKey(key: string): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  addView(view: any): GooglePickerBuilder;
  setCallback(callback: (data: any) => void): GooglePickerBuilder;
  setTitle(title: string): GooglePickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface GoogleDocsView {
  setMimeTypes(types: string): GoogleDocsView;
  setLabel(label: string): GoogleDocsView;
}
