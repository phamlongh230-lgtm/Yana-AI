---
name: prometheus-scraping-rules
description: Prometheus scrape configuration, recording rules, alerting rules, and Alertmanager routing. Service discovery, relabeling, federation, and cluster-wide agent health monitoring. Sources: prometheus/prometheus (Apache-2.0).
origin: yana-ai — synthesized from prometheus/prometheus (Apache-2.0)
license: Apache-2.0
version: 1.0.0
compatibility: yana-ai >= 1.3.52
---

# /prometheus-scraping-rules

## When to Use

- Scrape all yana-ai agent /metrics endpoints automatically via K8s service discovery
- Recording rules: pre-compute expensive queries (agent error rate per namespace)
- Alerting rules: fire alert when agent p99 latency > SLA for > 2 minutes
- Federation: aggregate metrics from multiple clusters into a global Prometheus

## Do NOT use for

- Log ingestion (use [[loki-log-aggregation]])
- Distributed tracing (use [[opentelemetry-distributed-tracing]])

---

## prometheus.yaml — scrape config

```yaml
global:
  scrape_interval:     15s    # default scrape every 15s
  evaluation_interval: 15s    # evaluate rules every 15s

scrape_configs:
  # Kubernetes pod discovery — scrape any pod with annotation
  - job_name: yana-ai-agents
    kubernetes_sd_configs:
      - role: pod
        namespaces: { names: [yana-ai, yana-ai-sandbox] }
    relabel_configs:
      # Only scrape pods with annotation prometheus.io/scrape: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      # Use custom port from annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: "${__meta_kubernetes_pod_ip}:${1}"
      # Add agent_id label from pod label
      - source_labels: [__meta_kubernetes_pod_label_agentId]
        target_label: agent_id

  # K8s API server
  - job_name: kubernetes-apiservers
    kubernetes_sd_configs: [{ role: endpoints }]
    scheme: https
    tls_config: { ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt }
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
```

---

## Recording rules (pre-compute expensive queries)

```yaml
# rules/yana-ai_recording.yaml
groups:
  - name: yana-ai.recording
    interval: 30s
    rules:
      # Error rate per agent (5-minute window)
      - record: yana-ai:agent_error_rate:rate5m
        expr: |
          sum by (agent_id, namespace) (
            rate(llm_requests_total{status="error"}[5m])
          ) /
          sum by (agent_id, namespace) (
            rate(llm_requests_total[5m])
          )

      # p99 TTFT per model
      - record: yana-ai:ttft_p99:5m
        expr: |
          histogram_quantile(0.99,
            sum by (model, le) (rate(llm_ttft_seconds_bucket[5m]))
          )
```

---

## Alerting rules

```yaml
# rules/yana-ai_alerts.yaml
groups:
  - name: yana-ai.alerts
    rules:
      - alert: AgentHighErrorRate
        expr: yana-ai:agent_error_rate:rate5m > 0.05
        for: 2m
        labels:     { severity: warning, team: yana-ai }
        annotations:
          summary:     "Agent {{ $labels.agent_id }} error rate {{ $value | humanizePercentage }}"
          description: "Agent in namespace {{ $labels.namespace }} exceeds 5% error rate"
          runbook_url: "https://wiki/yana-ai/runbooks/high-error-rate"

      - alert: AgentDown
        expr: up{job="yana-ai-agents"} == 0
        for: 1m
        labels:     { severity: critical }
        annotations:
          summary: "Agent {{ $labels.agent_id }} is down"
```

---

## Alertmanager routing

```yaml
# alertmanager.yaml
route:
  group_by: [alertname, namespace]
  group_wait:      30s
  group_interval:  5m
  repeat_interval: 12h
  receiver: default
  routes:
    - match: { severity: critical }
      receiver: pagerduty
    - match: { team: yana-ai }
      receiver: slack-yana-ai

receivers:
  - name: slack-yana-ai
    slack_configs:
      - api_url: "$SLACK_WEBHOOK"
        channel: "#yana-ai-alerts"
        text: "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
```

---

## Anti-Fake-Pass Checklist

```
❌ scrape_interval < 5s → Prometheus scrapes too fast, target overwhelmed
❌ Recording rules not evaluated → check evaluation_interval matches scrape_interval
❌ Alert for: 0m → fires immediately on first data point; always add minimum for: 1m
❌ relabeling drops __address__ → pods not scraped, no error reported
❌ Alertmanager not configured → alerts fire in Prometheus but nobody notified
❌ Federation without honor_labels: true → remote labels overwritten by local job label
```
