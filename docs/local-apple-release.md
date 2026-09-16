# Local Apple release configuration

WA Chem reads Apple release credentials from the `wa-chem` object in
`~/.apple.json`. The file must be mode `0600` and must never be committed.
Each future app can add a sibling top-level object without changing WA Chem.

```json
{
  "wa-chem": {
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
      },
      "developerIdApplication": {
        "p12Base64": "...",
        "password": "...",
        "identity": "Developer ID Application: ..."
      }
    },
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
locally, pushes the release tag, waits for the Linux Web/VOS workflow, and
adds the signed/notarized Mac DMG to the same GitHub Release.

For a signing-only App Store archive check that does not upload a build, first
materialize the config and then run `upload_apple_testflight.sh` with the third
argument `export`. Formal App Store review submission runs only after the
release tag has been created and pushed.
