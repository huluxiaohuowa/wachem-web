# Local Apple release configuration

WA Chem merges the team-wide `common` object with the app-specific `wa-chem`
object in `~/.apple.json`. The file must be mode `0600` and must never be
committed. New apps reuse `common` and add only their own provisioning profiles
under a sibling top-level object.

```json
{
  "common": {
    "teamId": "...",
    "temporaryKeychainPassword": "a local throwaway keychain password",
    "appStoreConnect": {
      "issuerId": "...",
      "keyId": "...",
      "privateKeyBase64": "base64 of AuthKey_*.p8"
    },
    "certificates": {
      "appleDistribution": {
        "p12Base64": "...",
        "password": "..."
      },
      "macInstallerDistribution": {
        "p12Base64": "...",
        "password": "..."
      }
    }
  },
  "wa-chem": {
    "provisioningProfiles": {
      "iosBase64": "...",
      "macCatalystBase64": "..."
    }
  }
}
```

For a machine-local setup, every `*Base64` field may instead be replaced by
the corresponding path field: `privateKeyPath`, `p12Path`, `iosPath`, or
`macCatalystPath`. A portable one-file setup should use Base64 fields.

`./update_version.sh` validates this object and the local iOS SDK before it
changes any version file. It then builds and uploads both Apple platforms
locally, pushes the release tag, and waits for the Linux Web/VOS workflow.
Mac distribution is App Store-only; GitHub Releases contain no DMG.

For a signing-only App Store archive check that does not upload a build, first
materialize the config and then run `upload_apple_testflight.sh` with the third
argument `export`. Formal App Store review submission runs only after the
release tag has been created and pushed.

## App Store update text

`./update_version.sh patch --submit-app-store` prepares both platforms' metadata
before submitting either one. It reads App Store Connect's version history and
uses the latest public iOS and macOS versions as separate baselines. What's New
includes changes across the complete `v<public-version>..v<new-version>` range,
including intermediate TestFlight releases. Pending and rejected submissions,
GitHub workflow success, and the submission flag on a tag are not public-release
evidence. Missing history, missing tags, or divergent Git ancestry stop submission
instead of guessing a baseline.

The generator removes release bookkeeping and commits marked `docs`, `test`,
`build`, `ci`, or `chore`, and deduplicates remaining commit subjects. The fallback
keeps the subjects' original language under localized headings. For polished
English and Simplified Chinese summaries, edit `release/app-store-release-notes.json`
with an explicit complete interval:

```json
{
  "from_version": "0.1.68",
  "version": "0.1.77",
  "notes": {
    "en-US": ["Summarize all user-visible changes across this interval."],
    "zh-Hans": ["概括此完整版本区间内的全部用户可见更新。"]
  }
}
```

A curated summary is used only for a platform whose public version matches
`from_version` and whose target matches `version`. A target-only or mismatched
summary cannot hide intermediate updates. Notes over 3,900 characters stop
submission and require a complete curated summary; older changes are never
silently truncated.

Promotional Text is intentionally stable across releases. Every submission
automatically fills both platforms from `release/app-store-promotional-text.json`.
Edit its `en-US` and `zh-Hans` values when the product positioning changes; each
must contain 1–170 characters. This uses fastlane's localized `release_notes.txt`
and `promotional_text.txt` metadata files. See the
[Apple field definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
and [fastlane metadata format](https://docs.fastlane.tools/actions/deliver/).

To preview without uploading or submitting, supply a saved version-history JSON
array (each entry contains `platform`, `versionString`, and `appVersionState` or
`appStoreState`) and an existing target tag:

```sh
python3 scripts/prepare_apple_release_notes.py 0.1.77 /tmp/wa-chem-metadata-preview \
  --versions-file /tmp/wa-chem-app-store-versions.json
```

Without `--versions-file`, the preview queries App Store Connect using the same
API credential environment variables as the submission script. Lookup and
metadata preparation are read-only; only `fastlane deliver` performs submission.
