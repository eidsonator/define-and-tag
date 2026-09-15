# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and future releases will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-15

This first release entry retrospectively records the notable changes made before
the project adopted a changelog. Earlier commits were not versioned or tagged.

### Added

- Authenticated personal dictionary with word lookup, fuzzy search, definitions,
  and thesaurus results.
- Saved words with notes, tags, multiple word lists, and sorting controls.
- Supabase-backed schema and migrations for personal word lists and saved words.
- Authenticated REST API and MCP server for managing word lists and saved words.
- Repository guidance for working with the Lovable-connected project.
- Pre-commit checks for formatting, linting, file hygiene, merge conflicts,
  oversized files, and private keys.
- Unit tests and a coverage gate for core fuzzy-matching behavior.
- Continuous quality checks for type safety, production builds, browser
  accessibility smoke tests, and migration replay validation.
- CodeQL code scanning and dependency-review automation.

### Fixed

- Legacy databases that lack the old word-list index can complete the
  multi-list migration safely.
- Fuzzy matching returns no result when a query has no matching characters.
