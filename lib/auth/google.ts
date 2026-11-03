// Google Identity Services (techspec §13): Google's own sign-in button on
// Bloom's page. It hands back an ID token, which Supabase verifies with
// signInWithIdToken. Google's screen then names Bloom's address instead of
// Supabase's.

const SCRIPT = "https://accounts.google.com/gsi/client";

export interface CredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  initialize(config: {
    client_id: string;
    callback: (r: CredentialResponse) => void;
    nonce: string;
    ux_mode?: "popup" | "redirect";
    context?: "signin" | "signup" | "use";
    itp_support?: boolean;
    use_fedcm_for_button?: boolean;
    auto_select?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

/** The public OAuth client ID (not a secret). */
export const googleClientId = (): string | undefined =>
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || undefined;

let loading: Promise<GoogleIdentity> | null = null;

/** Loads Google's script once; rejects if it can't load in time. */
export function loadGoogleIdentity(timeoutMs = 8000): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id)
    return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    script.onload = () => {
      clearTimeout(timer);
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("missing"));
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("blocked"));
    };
    document.head.appendChild(script);
  }).catch((err) => {
    loading = null; // allow a retry on the next visit
    throw err;
  });
  return loading;
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** A one-time nonce: Google gets its SHA-256 (it goes into the ID token),
 *  Supabase gets the raw value and checks the two match, so a token can't
 *  be replayed. */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const hashed = hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)),
  );
  return { raw, hashed };
}
