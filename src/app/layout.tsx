import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

// Soft serif for the title and big score numbers
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bloomline — a one-line garden roguelike",
  description:
    "Draw one unbroken line to the Exit, clear Garden Bed after Garden Bed, and see how far your Garden Run can go. Longer lines score far more.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bloomline",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#19281E",
};

const EXTENSION_SHIELD_SCRIPT = `
(function() {
  try {
    // 1. Prevent faulty Chrome extensions (e.g. chrome-extension://.../executors/200.js)
    // from triggering the Next.js Dev Error Overlay
    window.addEventListener('error', function(event) {
      var file = (event && event.filename) || '';
      var stack = (event && event.error && event.error.stack) || '';
      var msg = (event && event.message) || '';
      if (
        file.indexOf('chrome-extension://') !== -1 ||
        file.indexOf('moz-extension://') !== -1 ||
        stack.indexOf('chrome-extension://') !== -1 ||
        stack.indexOf('moz-extension://') !== -1 ||
        msg.indexOf('M_ID') !== -1
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      }
    }, true);

    window.addEventListener('unhandledrejection', function(event) {
      var reason = event && event.reason;
      var stack = (reason && reason.stack) || '';
      var msg = (reason && reason.message) || String(reason || '');
      if (
        stack.indexOf('chrome-extension://') !== -1 ||
        stack.indexOf('moz-extension://') !== -1 ||
        msg.indexOf('M_ID') !== -1
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      }
    }, true);

    // 2. Strip DOM attributes injected by extensions (e.g. Bitdefender bis_skin_checked)
    // before React hydrates
    var ATTRS = ['bis_skin_checked', 'bis_register'];
    function cleanNode(node) {
      if (!node || node.nodeType !== 1) return;
      for (var i = 0; i < ATTRS.length; i++) {
        if (node.hasAttribute && node.hasAttribute(ATTRS[i])) {
          node.removeAttribute(ATTRS[i]);
        }
      }
    }
    function cleanTree(root) {
      if (!root || !root.querySelectorAll) return;
      var els = root.querySelectorAll('[bis_skin_checked],[bis_register]');
      for (var i = 0; i < els.length; i++) {
        cleanNode(els[i]);
      }
    }
    cleanTree(document);
    var obs = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') {
          cleanNode(m.target);
        } else if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            cleanNode(n);
            cleanTree(n);
          }
        }
      }
    });
    obs.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['bis_skin_checked', 'bis_register']
    });
    window.addEventListener('load', function() {
      setTimeout(function() { obs.disconnect(); }, 4000);
    });
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${nunito.variable} ${fraunces.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: EXTENSION_SHIELD_SCRIPT }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-[#101813] font-sans text-white antialiased selection:bg-violet-500 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
