# Portable native chemistry core

`WAChemChemistryCore` is the shared Swift implementation used by the Apple canvas and by Linux validation. It contains chemistry properties, SMILES/Molfile import/export, structure layout, native IUPAC/NISPO rules, the generated ranker and the existing NISPO resources. Its dependency `WAChemDocumentModel` contains Foundation-only document/selection value types and the shared chemical drawing scale.

Metal, text sprite caching, SwiftUI, UIKit, canvas interaction and scene rendering remain in the Apple-only targets. `WAChemAppleCanvas` re-exports the chemistry API and `WAChemRender` re-exports the document model, preserving client import paths. The existing chemistry source paths are retained so generators continue to update the same implementation. There is no Linux copy of the naming rules or fixture resources.

## Build and test

Install an official Swift 6 toolchain and zlib development headers on Linux. From the repository root:

```sh
swift --version
./scripts/test_native_chemistry.sh
./scripts/test_native_chemistry.sh --filter NativeBicyclicSemanticsTests
swift run --package-path apps/apple-core WAChemNISPOCLI --input molecules.json
```

The test wrapper uses package-local caches to work in restricted cloud environments. The SwiftPM manifest exposes document/chemistry/CLI and chemistry tests on Linux. On macOS it additionally exposes the original renderer, canvas, debug app and Apple UI test targets. Six UI-dependent naming tests remain in `NativeIUPACCanvasTests`; they are not counted as Linux tests.

CLI input is a JSON array such as:

```json
[{"id":"bridge-regression","smiles":"C1=CC2=CCCCC(C1)CCCC2"}]
```

The ordered output records `id`, `smiles`, `status`, `nativeName` when present, `ruleFamily` and warnings. An unsuccessful parse/naming result stays explicit. No network chemistry lookup or fallback name is performed by this tool. Add `--progress` to log case IDs and elapsed times to stderr during long audits, while stdout remains machine-readable JSON.

## Differential chemistry validation

The existing `scripts/verify_native_iupac_differential.py` and corpus registry continue to select `NativeIUPACTests` by class/method, independent of the owning SwiftPM test target. Use the pinned dependencies in `docs/iupac-dependencies.lock.json` for OPSIN/RDKit validation. Exact reference-text agreement and molecular graph equivalence are separate checks: a frozen upstream name can itself describe the wrong graph.

The portable suite establishes chemical/model behavior only. It does not establish an Xcode, Mac Catalyst, iOS, Metal, or UI build pass. Run the repository's current-source Apple build/test recipe separately before release.
