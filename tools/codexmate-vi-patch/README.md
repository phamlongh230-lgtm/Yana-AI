# Codexmate — VI Patch (yamtam-engine bản riêng)

Patch codexmate local: **VI lên đầu danh sách ngôn ngữ, bỏ tiếng Trung**.  
Chỉ áp cho bản local dùng với yamtam-engine — không đụng repo codexmate gốc.

## Cách dùng

```bash
# Cài codexmate global trước
npm install -g codexmate

# Chạy patch
python3 tools/codexmate-vi-patch/patch.py

# Restart
codexmate run
```

Mặc định mở là **Tiếng Việt**. Tiếng Trung (中文) đã bị loại bỏ.

## Patch bao gồm

- `vi.mjs` → thay thế toàn bộ locale VI (1225 dòng, đầy đủ 1138 keys)
- `i18n.mjs` → bỏ `zh` khỏi `LANGUAGE_META`, đặt `vi` lên đầu (mặc định)

## Re-patch sau khi update codexmate

```bash
npm update -g codexmate
python3 tools/codexmate-vi-patch/patch.py
```
