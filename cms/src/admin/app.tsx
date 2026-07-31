import { Chart, registerables } from "chart.js";
import { ChartPie } from "@strapi/icons";

/**
 * Admin panel customisation.
 *
 * Two jobs: make the Google Analytics plugin's charts render at all, and
 * surface an analytics summary on the admin home page.
 */
export default {
  config: {},

  /**
   * Widgets must be registered here rather than in `bootstrap`. `register`
   * receives the full StrapiApp including `widgets`; `bootstrap` receives a
   * reduced object without it, so registering there throws and blanks the
   * whole admin panel.
   */
  register(app: { widgets: { register: (widget: unknown) => void } }) {
    app.widgets.register({
      icon: ChartPie,
      title: { id: "ga-overview.title", defaultMessage: "Google Analytics" },
      // Lazy so the widget's code is not in the initial admin bundle.
      component: async () => {
        const { GoogleAnalyticsWidget } = await import("./components/GoogleAnalyticsWidget");
        return GoogleAnalyticsWidget;
      },
      id: "ga-overview",
    });
  },

  bootstrap() {
    /**
     * Chart.js v3+ is tree-shakeable: scales and elements must be registered
     * before any chart is constructed, or it throws `"category" is not a
     * registered scale`.
     *
     * strapi-google-analytics-dashboard does register them inside its own
     * bundle, so this ought to be redundant — and on Strapi 5.42 (what the
     * sibling stimes.ae project runs) it is. On 5.51 the admin's Vite build
     * resolves the plugin's prebuilt chunk against a different Chart.js
     * instance than its charts draw with, so the plugin's registration lands
     * on a registry nothing reads and the dashboard dies on load.
     *
     * Registering here puts the scales on the instance this build actually
     * uses. `registerables` is the full set rather than the nine the plugin
     * names: the failure mode is a blank error screen, and the cost of
     * registering everything is a few KB in an admin-only bundle.
     */
    Chart.register(...registerables);

    if (typeof window === "undefined") return;

    /**
     * The plugin renders its chart cards with an inline `min-height: 250px`,
     * which leaves a large empty band below the charts on tall screens. Scope
     * a height override to the plugin's own route and let the canvases — which
     * are responsive — grow to fill it.
     *
     * Keyed on that inline `min-height: 250px` signature rather than the
     * plugin's hashed class names, so it survives plugin and admin rebuilds.
     */
    const PLUGIN_ID = "strapi-google-analytics-dashboard";
    const STYLE_ID = "ga-dashboard-fit";

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        body[data-ga-dashboard] div[style*="min-height: 250px"] {
          min-height: clamp(280px, 36vh, 460px) !important;
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * The admin is a single-page app, so the attribute has to be toggled as it
     * navigates in and out of the plugin route rather than set once on load.
     */
    const sync = () => {
      const onPage = window.location.pathname.includes(PLUGIN_ID);
      const was = document.body.hasAttribute("data-ga-dashboard");
      document.body.toggleAttribute("data-ga-dashboard", onPage);
      // Chart.js only re-measures on resize, so nudge it when the containers
      // have just become taller.
      if (onPage && !was) window.dispatchEvent(new Event("resize"));
    };

    sync();
    window.addEventListener("popstate", sync);

    // popstate fires on back/forward only, so patch the history methods the
    // router uses for in-app navigation.
    const hist = history as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const method of ["pushState", "replaceState"]) {
      const original = hist[method].bind(history);
      hist[method] = (...args: unknown[]) => {
        const result = original(...args);
        sync();
        return result;
      };
    }
  },
};
