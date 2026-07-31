import { useEffect, useState } from "react";
import { Box, Flex, Typography, Button } from "@strapi/design-system";

/**
 * Google Analytics overview for the admin home dashboard.
 *
 * Reads the same endpoint the plugin's own dashboard uses, so the numbers here
 * and there cannot disagree. That endpoint is unauthenticated (the plugin
 * declares `auth: false` on all its routes — see config/plugins.ts), which is
 * why this needs no token; it is also why the service account behind it must be
 * scoped to survive disclosure.
 *
 * Aggregation note: `/charts/overview` returns one row per day. Counts are
 * summed across the range; rates are averaged, because summing a percentage
 * across 30 days produces a meaningless number in the thousands.
 */

type Range = "7d" | "30d" | "90d";

/**
 * Index into each row's `metricValues`, whose order is fixed by the plugin's
 * query: [activeUsers, sessions, bounceRate, screenPageViews, engagementRate,
 * newUsers]. Positional rather than named because that is what the API returns.
 */
const METRICS = [
  { key: "activeUsers", label: "Active Users", idx: 0, kind: "int" },
  { key: "newUsers", label: "New Users", idx: 5, kind: "int" },
  { key: "sessions", label: "Sessions", idx: 1, kind: "int" },
  { key: "pageViews", label: "Page Views", idx: 3, kind: "int" },
  { key: "engagementRate", label: "Engagement Rate", idx: 4, kind: "pct" },
  { key: "bounceRate", label: "Bounce Rate", idx: 2, kind: "pct" },
] as const;

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

interface Row {
  metricValues?: { value?: string }[];
}

export const GoogleAnalyticsWidget = () => {
  const [range, setRange] = useState<Range>("7d");
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guards against a slow response for an earlier range landing after a
    // faster one for the range the user has since switched to.
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/strapi-google-analytics-dashboard/charts/overview?range=${range}`, {
      headers: { accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json) => {
        if (!active) return;
        if (json?.error) {
          setError(json.message || "Unable to load Google Analytics data.");
          setStats(null);
          return;
        }
        const rows: Row[] = json?.rows ?? [];
        const totals: Record<string, number> = {};
        for (const metric of METRICS) {
          const values = rows.map((r) => Number(r.metricValues?.[metric.idx]?.value ?? 0));
          totals[metric.key] =
            metric.kind === "pct"
              ? values.length
                ? values.reduce((a, b) => a + b, 0) / values.length
                : 0
              : values.reduce((a, b) => a + b, 0);
        }
        setStats(totals);
      })
      .catch(() => {
        if (active) setError("Unable to load Google Analytics data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range]);

  const format = (metric: (typeof METRICS)[number]): string => {
    const value = stats?.[metric.key] ?? 0;
    return metric.kind === "pct"
      ? `${(value * 100).toFixed(1)}%`
      : Math.round(value).toLocaleString();
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
        <Typography variant="delta">Google Analytics overview</Typography>
        <Flex gap={1}>
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="S"
              variant={r.value === range ? "default" : "tertiary"}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </Flex>
      </Flex>

      {loading ? (
        <Flex justifyContent="center" padding={8}>
          <Typography variant="omega" textColor="neutral500">
            Loading analytics…
          </Typography>
        </Flex>
      ) : error ? (
        <Flex
          direction="column"
          alignItems="center"
          gap={2}
          padding={8}
          style={{ textAlign: "center" }}
        >
          <Typography variant="omega" textColor="neutral600">
            {error}
          </Typography>
          <Typography variant="pi" textColor="neutral500">
            Check Settings → Google Analytics (Property ID + service account).
          </Typography>
        </Flex>
      ) : (
        <Flex wrap="wrap" gap={4}>
          {METRICS.map((metric) => (
            <Box
              key={metric.key}
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              padding={4}
              style={{ flex: "1 1 30%", minWidth: 150 }}
            >
              <Typography variant="sigma" textColor="neutral600">
                {metric.label}
              </Typography>
              <Box paddingTop={1}>
                <Typography variant="alpha" fontWeight="bold">
                  {format(metric)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Flex>
      )}
    </Flex>
  );
};
