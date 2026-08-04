# Feature: Base64

## Purpose

Encode and decode Base64 strings in-browser.

## Behavior

- Mode: encode | decode
- Invalid decode input → inline error
- Copy via explicit user action

## Logic

Pure encode/decode helpers; define UTF-8 handling explicitly in implementation.

## Tests

Mirror under `testing/unit/tools/base64/`.
