# Reassemble Instructions

Files split with `split -b 24m`, reassemble with:

```bash
cat Antigravity_tar.gz.part_* > Antigravity_tar.gz
```

Or verify integrity after reassembly:
```bash
tar -tzf Antigravity_tar.gz
```
