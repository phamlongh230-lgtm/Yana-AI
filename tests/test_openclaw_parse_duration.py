"""Tests for the openclaw_adapted parse-duration port.

Origin: core/lib/openclaw_adapted/parse_duration.py (ported from
openclaw/openclaw, MIT, src/cli/parse-duration.ts, pinned commit
e2c567538d8964ab594f63ea3121ee72149f273d). No upstream .test.ts was vendored
for this module, so all cases below are written fresh against the documented
behavior (module docstring + upstream source), not translated from an
existing test file.
"""
import pytest

from core.lib.openclaw_adapted.parse_duration import (
    InvalidDurationError,
    parse_duration_ms,
)


def test_bare_number_uses_ms_default_unit():
    assert parse_duration_ms("500") == 500


def test_bare_number_uses_explicit_default_unit():
    assert parse_duration_ms("5", default_unit="s") == 5000


@pytest.mark.parametrize(
    "raw,expected_ms",
    [
        ("500ms", 500),
        ("30s", 30_000),
        ("5m", 300_000),
        ("2h", 7_200_000),
        ("1d", 86_400_000),
    ],
)
def test_single_unit_tokens(raw, expected_ms):
    assert parse_duration_ms(raw) == expected_ms


def test_decimal_value_is_supported():
    assert parse_duration_ms("1.5s") == 1500


def test_composite_duration_sums_segments():
    assert parse_duration_ms("1h30m") == 5_400_000
    assert parse_duration_ms("2m500ms") == 120_500


def test_is_case_insensitive():
    assert parse_duration_ms("5S") == 5000
    assert parse_duration_ms("1H30M") == 5_400_000


def test_whitespace_is_trimmed():
    assert parse_duration_ms("  30s  ") == 30_000


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "   ",
        "-5s",
        "5x",
        "abc",
        "1h 30m",  # gap between composite segments is rejected
        "h30m",  # missing leading value
    ],
)
def test_invalid_inputs_raise(raw):
    with pytest.raises(InvalidDurationError):
        parse_duration_ms(raw)


def test_overflow_beyond_safe_integer_raises():
    with pytest.raises(InvalidDurationError):
        parse_duration_ms("9007199254740993ms")


def test_error_message_quotes_the_raw_value_and_suggests_examples():
    with pytest.raises(InvalidDurationError) as exc_info:
        parse_duration_ms("bogus")
    message = str(exc_info.value)
    assert '"bogus"' in message
    assert "500ms" in message


def test_error_message_reports_empty_value_without_quotes():
    with pytest.raises(InvalidDurationError) as exc_info:
        parse_duration_ms("   ")
    assert "empty value" in str(exc_info.value)
