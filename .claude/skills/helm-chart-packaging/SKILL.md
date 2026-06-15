---
name: helm-chart-packaging
description: Helm chart creation, templating, and lifecycle management. Chart structure, values.yaml overrides, named templates, hooks, dependency management, and programmatic chart operations via Helm SDK. Sources: helm/helm (Apache-2.0).
origin: yana-ai — synthesized from helm/helm (Apache-2.0)
license: Apache-2.0
version: 1.0.0
compatibility: yana-ai >= 1.3.52
---

# /helm-chart-packaging

## When to Use

- Package yana-ai agent deployment as a reusable, versioned Helm chart
- Parameterize deployments: different tiers, replicas, resource limits via values.yaml
- Chart hooks: run database migration Job before deployment, cleanup Job after delete
- Dependency management: yana-ai chart depends on Redis, PostgreSQL subcharts

## Do NOT use for

- Single-environment one-off deployments (kubectl apply is simpler)
- GitOps sync (combine with [[argocd-gitops]] for full GitOps pipeline)

---

## Chart directory structure

```
yana-ai-agent/
├── Chart.yaml           ← chart metadata
├── values.yaml          ← default values (override at deploy time)
├── templates/
│   ├── _helpers.tpl     ← named template functions
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml         ← HorizontalPodAutoscaler
│   └── NOTES.txt        ← post-install instructions
└── charts/              ← subchart dependencies
```

---

## Chart.yaml

```yaml
apiVersion: v2
name:        yana-ai-agent
description: Yamtam agent deployment chart
type:        application
version:     1.3.52          # chart version (SemVer)
appVersion:  "1.3.52"        # app version (informational)

dependencies:
  - name:       redis
    version:    "^17.0.0"
    repository: https://charts.bitnami.com/bitnami
    condition:  redis.enabled
```

---

## values.yaml

```yaml
replicaCount: 2

image:
  repository: ghcr.io/yana-ai/agent
  pullPolicy:  IfNotPresent
  tag:         ""   # defaults to Chart.appVersion

agent:
  tier:    power
  skills:  [ecc-key-management, jwt-jws-jwe-patterns]

resources:
  requests: { memory: "256Mi", cpu: "100m" }
  limits:   { memory: "512Mi", cpu: "500m" }

autoscaling:
  enabled:     true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

redis:
  enabled:  true
  auth:
    enabled: false
```

---

## templates/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "yana-ai-agent.fullname" . }}
  labels: {{ include "yana-ai-agent.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels: {{ include "yana-ai-agent.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{ include "yana-ai-agent.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: agent
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          env:
            - name:  YANA_TIER
              value: {{ .Values.agent.tier | quote }}
            - name:  YANA_SKILLS
              value: {{ .Values.agent.skills | join "," | quote }}
          resources: {{ toYaml .Values.resources | nindent 12 }}
```

---

## Deploy / upgrade / rollback

```bash
# Install
helm install yana-ai-prod ./yana-ai-agent \
  --namespace yana-ai --create-namespace \
  --set agent.tier=power \
  --set replicaCount=4

# Upgrade (rolling update)
helm upgrade yana-ai-prod ./yana-ai-agent \
  --namespace yana-ai \
  --set image.tag=1.3.53 \
  --atomic   # rollback automatically if upgrade fails

# Rollback to previous release
helm rollback yana-ai-prod 0  # 0 = previous revision

# Dry-run (render templates without applying)
helm install --dry-run --debug yana-ai-test ./yana-ai-agent
```

---

## Anti-Fake-Pass Checklist

```
❌ image.tag: "latest" → Kubernetes caches latest; new image not pulled without imagePullPolicy: Always
❌ No --atomic on upgrade → failed upgrade leaves chart in broken state with no automatic rollback
❌ Hard-coded secrets in values.yaml → secrets in git history; use Sealed Secrets or External Secrets
❌ Missing _helpers.tpl fullname truncation to 63 chars → label values exceed K8s limit
❌ Subchart not updated (helm dependency update) → old subchart version installed silently
❌ templates/ directory empty → helm install succeeds but deploys nothing
```
