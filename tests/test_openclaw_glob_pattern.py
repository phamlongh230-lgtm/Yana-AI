"""Tests for the openclaw_adapted glob-pattern port.

Origin: core/lib/openclaw_adapted/glob_pattern.py (ported from openclaw/openclaw,
MIT, src/agents/glob-pattern.ts, pinned commit
e2c567538d8964ab594f63ea3121ee72149f273d). No upstream .test.ts was vendored
for this module, so all cases below are written fresh against the documented
behavior, not translated from an existing test file.
"""
from core.lib.openclaw_adapted.glob_pattern import (
    compile_glob_patterns,
    matches_any_glob_pattern,
)

_IDENTITY = lambda value: value  # noqa: E731 — matches upstream's identity-default usage


def test_non_list_raw_returns_empty():
    assert compile_glob_patterns(None, _IDENTITY) == []
    assert compile_glob_patterns("not-a-list", _IDENTITY) == []


def test_empty_pattern_after_normalize_is_dropped():
    patterns = compile_glob_patterns([""], _IDENTITY)
    assert patterns == []


def test_wildcard_only_compiles_to_all_kind():
    patterns = compile_glob_patterns(["*"], _IDENTITY)
    assert len(patterns) == 1
    assert patterns[0].kind == "all"
    assert matches_any_glob_pattern("anything-at-all", patterns) is True
    assert matches_any_glob_pattern("", patterns) is True


def test_literal_pattern_compiles_to_exact_kind_and_requires_full_match():
    patterns = compile_glob_patterns(["foo"], _IDENTITY)
    assert patterns[0].kind == "exact"
    assert matches_any_glob_pattern("foo", patterns) is True
    assert matches_any_glob_pattern("foobar", patterns) is False
    assert matches_any_glob_pattern("xfoo", patterns) is False


def test_wildcard_pattern_compiles_to_regex_kind_and_anchors_full_string():
    patterns = compile_glob_patterns(["foo*bar"], _IDENTITY)
    assert patterns[0].kind == "regex"
    assert matches_any_glob_pattern("foobar", patterns) is True
    assert matches_any_glob_pattern("fooXXXbar", patterns) is True
    assert matches_any_glob_pattern("xfoobar", patterns) is False  # anchored at start
    assert matches_any_glob_pattern("foobarx", patterns) is False  # anchored at end


def test_regex_metacharacters_in_pattern_are_escaped_literally():
    # "a.b*" must require a literal dot, not "any character", before the wildcard tail.
    patterns = compile_glob_patterns(["a.b*"], _IDENTITY)
    assert matches_any_glob_pattern("a.bxyz", patterns) is True
    assert matches_any_glob_pattern("axbxyz", patterns) is False


def test_literal_pattern_with_metacharacters_and_no_wildcard_is_exact():
    patterns = compile_glob_patterns(["a.b"], _IDENTITY)
    assert patterns[0].kind == "exact"
    assert matches_any_glob_pattern("a.b", patterns) is True
    assert matches_any_glob_pattern("axb", patterns) is False


def test_matches_any_with_multiple_patterns_short_circuits_on_all():
    patterns = compile_glob_patterns(["specific", "*"], _IDENTITY)
    assert matches_any_glob_pattern("totally-unrelated", patterns) is True


def test_matches_any_with_empty_pattern_list_is_false():
    assert matches_any_glob_pattern("anything", []) is False


def test_normalize_callback_is_applied_before_compiling():
    patterns = compile_glob_patterns(["  FOO*  "], str.strip)
    # normalize only strips whitespace here; case is untouched, so match must
    # be against the normalized-but-still-uppercase value.
    assert matches_any_glob_pattern("FOOBAR", patterns) is True
    assert matches_any_glob_pattern("foobar", patterns) is False


def test_security_sensitive_values_are_matched_as_plain_strings():
    # Path traversal / shell metacharacter strings must not be treated as
    # anything other than literal text to match (no implicit eval/exec path).
    patterns = compile_glob_patterns(["../../etc/passwd"], _IDENTITY)
    assert patterns[0].kind == "exact"
    assert matches_any_glob_pattern("../../etc/passwd", patterns) is True
    assert matches_any_glob_pattern("; rm -rf /", patterns) is False
