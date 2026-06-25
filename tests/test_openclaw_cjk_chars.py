"""Tests for the openclaw_adapted cjk-chars port.

Origin: core/lib/openclaw_adapted/cjk_chars.py (ported from openclaw/openclaw,
MIT, src/utils/cjk-chars.ts, pinned commit
e2c567538d8964ab594f63ea3121ee72149f273d). No upstream .test.ts was vendored
for this module, so all cases below are written fresh against the documented
behavior (module docstring + upstream source comments), not translated from
an existing test file.
"""
import math

import pytest

from core.lib.openclaw_adapted.cjk_chars import (
    CHARS_PER_TOKEN_ESTIMATE,
    estimate_string_chars,
    estimate_tokens_from_chars,
)


def test_empty_string_is_zero_chars():
    assert estimate_string_chars("") == 0


def test_pure_ascii_is_unweighted():
    assert estimate_string_chars("hello world") == len("hello world")


def test_single_chinese_char_is_weighted_to_four():
    # CJK Unified Ideographs block (U+2E80-U+9FFF) — 1 token/char target.
    assert estimate_string_chars("中") == CHARS_PER_TOKEN_ESTIMATE


def test_single_hiragana_char_is_weighted_to_four():
    assert estimate_string_chars("あ") == CHARS_PER_TOKEN_ESTIMATE


def test_single_hangul_char_is_weighted_to_four():
    assert estimate_string_chars("가") == CHARS_PER_TOKEN_ESTIMATE


def test_mixed_latin_and_cjk_sums_independently():
    # "a" -> 1 (unweighted) + "中" -> 4 (weighted) == 5
    assert estimate_string_chars("a中") == 5


def test_non_cjk_supplementary_plane_emoji_weighted_to_two():
    # Emoji are not matched by the CJK regex but sit in the supplementary
    # plane, so upstream keeps the UTF-16 surrogate-pair weight of 2.
    assert estimate_string_chars("🔥") == 2


def test_cjk_extension_b_supplementary_char_collapses_to_four():
    # U+20000 is in the CJK Extension B+ non-Latin range; upstream corrects
    # the surrogate pair back down to 1 unit before applying the x4 weight.
    assert estimate_string_chars(chr(0x20000)) == CHARS_PER_TOKEN_ESTIMATE


def test_tokens_from_chars_rounds_up():
    assert estimate_tokens_from_chars(0) == 0
    assert estimate_tokens_from_chars(1) == 1
    assert estimate_tokens_from_chars(4) == 1
    assert estimate_tokens_from_chars(5) == 2


def test_tokens_from_chars_matches_math_ceil_for_known_ratio():
    assert estimate_tokens_from_chars(17) == math.ceil(17 / CHARS_PER_TOKEN_ESTIMATE)


def test_tokens_from_chars_clamps_negative_to_zero():
    assert estimate_tokens_from_chars(-5) == 0


@pytest.mark.parametrize(
    "edge_input",
    [
        "",
        "a" * 65536,
        "中" * 4096,
        "key\x00value",
        "line1\r\nline2",
        "‮../../etc/passwd",
        "'; DROP TABLE users; --",
    ],
)
def test_does_not_crash_on_boundary_input(edge_input):
    result = estimate_string_chars(edge_input)
    assert isinstance(result, int)
    assert result >= 0
