# Security Policy — YAMTAM ENGINE · Chính sách bảo mật

> **[Tiếng Việt bên dưới / Vietnamese below](#tiếng-việt-1)**

## Supported Versions

| Version | Supported | Notes |
|---|---:|---|
| 1.8.x | ✅ Active | Current stable release line |
| 1.7.x | ⚠️ Security fixes only | Upgrade recommended |
| 1.6.x and below | ❌ End of life | No security support |

---

## Reporting a Vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

Report privately via:

- GitHub Security Advisories: repo → Security tab → Report a vulnerability
- Email: include `YAMTAM SECURITY` in the subject line

We will acknowledge reports within 48 hours and aim to patch critical issues within 7 days.

---

## Scope

YAMTAM ENGINE is a governance and safety framework for AI-assisted development. It is **not** a production authentication, authorization, or secrets-management system.

We treat the following as security-critical:

| Type | Example |
|---|---|
| Hook bypass | A pattern that lets an agent skip the push, deploy, or destructive-operation gate |
| Secret leakage | A path where API keys, tokens, or credentials could be logged or exposed |
| Command injection | A hook or script that can be tricked into running unintended shell commands |
| Audit log tampering | A way to delete, rewrite, or forge audit logs without detection |
| Unsafe release packaging | A release pack that includes secrets, local state, or unintended project files |

Out of scope:

- Vulnerabilities in Cursor, Aider, GitHub Copilot, Gemini, OpenRouter, or other third-party AI tools themselves
- Issues in third-party tools invoked by agents, such as `gitleaks`, `semgrep`, `gh`, `git`, Docker, or cloud CLIs
- Misconfiguration in downstream projects after YAMTAM is installed
- Advisory-only behavior for non-Claude engines where runtime hooks are not wired

---

## Security Architecture

```text
L0 — Audit log, tamper-evident hash chain
L1 — Token scope guard, warns on secret file access
L2 — Commit gate, warns or blocks unsafe cross-scope commits
L3 — Truth gate, blocks unsupported PASS claims
L4 — Deploy gate, blocks gh/kubectl/docker deploy actions without approval
L5 — Destructive ops guard, blocks rm -rf, DROP TABLE, force push, and similar high-risk actions

---

Runtime enforcement is active only when hooks are wired in .claude/settings.json.

For other engines such as Cursor, Aider, Copilot, Gemini, Qwen, DeepSeek, or OpenRouter-routed models, YAMTAM rules may be advisory unless the engine supports equivalent runtime hooks.

Responsible Disclosure

We follow coordinated disclosure.

We will:

Credit reporters in CHANGELOG.md, unless anonymity is requested
Avoid public disclosure until a fix or mitigation is available
Not take legal action against good-faith security research that follows this policy
Prioritize fixes based on severity, exploitability, and impact on release-pack safety
Release Integrity

Official release artifacts are published through GitHub Releases.

For v1.8.0 and later, users should prefer:

yamtam-engine-latest.zip

or the versioned release asset:

yamtam-engine-v1.8.0-fixed.zip

Do not install YAMTAM from random copied folders, unknown archives, or modified release packs without checking the source.

---

## Tiếng Việt

### Phiên bản được hỗ trợ

| Phiên bản | Hỗ trợ | Ghi chú |
|---|---:|---|
| 1.8.x | ✅ Đang hoạt động | Dòng phát hành ổn định hiện tại |
| 1.7.x | ⚠️ Chỉ vá lỗi bảo mật | Khuyến nghị nâng cấp |
| 1.6.x trở xuống | ❌ Hết hỗ trợ | Không còn hỗ trợ bảo mật |

### Báo cáo lỗ hổng bảo mật

**Không mở GitHub Issue công khai cho các lỗ hổng bảo mật.**

Báo cáo riêng tư qua:

- GitHub Security Advisories: repo → tab Security → Report a vulnerability
- Email: ghi `YAMTAM SECURITY` trong tiêu đề

Chúng tôi sẽ xác nhận báo cáo trong 48 giờ và nhắm vá các vấn đề nghiêm trọng trong 7 ngày.

### Phạm vi

YAMTAM ENGINE là framework quản trị và an toàn cho phát triển có AI hỗ trợ. Đây **không** phải hệ thống xác thực, phân quyền hay quản lý secret cho production.

Các loại vấn đề được coi là nghiêm trọng về bảo mật:

| Loại | Ví dụ |
|---|---|
| Hook bypass | Pattern cho phép agent bỏ qua gate push, deploy, hoặc destructive-operation |
| Lộ secret | Đường dẫn API key, token hoặc credential có thể bị log hoặc expose |
| Command injection | Hook/script có thể bị lừa chạy lệnh shell ngoài ý muốn |
| Giả mạo audit log | Cách xóa, viết lại hoặc làm giả audit log mà không bị phát hiện |
| Đóng gói release không an toàn | Gói release có chứa secret, trạng thái local, hoặc file không mong muốn |

Ngoài phạm vi:

- Lỗ hổng trong Cursor, Aider, GitHub Copilot, Gemini, OpenRouter và các AI tool bên thứ ba
- Vấn đề trong công cụ bên thứ ba mà agent gọi (gitleaks, semgrep, gh, git, Docker, cloud CLI)
- Cấu hình sai trong các dự án downstream sau khi cài YAMTAM
- Hành vi tư vấn cho engine không phải Claude (không có runtime hook được nối)

### Tiết lộ có trách nhiệm

Chúng tôi tuân theo quy trình tiết lộ có phối hợp:

- Ghi nhận người báo cáo trong `CHANGELOG.md` (trừ khi yêu cầu ẩn danh)
- Không tiết lộ công khai cho đến khi có bản vá hoặc giải pháp tạm thời
- Không có hành động pháp lý với nghiên cứu bảo mật thiện chí theo chính sách này
- Ưu tiên vá dựa trên mức độ nghiêm trọng, khả năng khai thác và tác động đến an toàn gói phát hành

### Toàn vẹn phát hành

Các artifact phát hành chính thức được đăng qua GitHub Releases. Không cài YAMTAM từ thư mục sao chép ngẫu nhiên, archive không rõ nguồn gốc, hoặc gói phát hành đã bị chỉnh sửa mà không kiểm tra nguồn.
