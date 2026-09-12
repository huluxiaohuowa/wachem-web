---
license: apache-2.0
tasks:
- image-to-text
frameworks:
- pytorch
- coreml
tags:
- chemistry
- ocsr
- optical-chemical-structure-recognition
- smiles
- e-smiles
- molparser-compatible
- apple
datasets:
  train:
  - huluxiaohuowa/WA-Chem-OCSR-Mobile-Dataset
  evaluation:
  - huluxiaohuowa/WA-Chem-OCSR-Mobile-Dataset
domain:
- cv
---
# WA Chem OCSR Mobile
## Model Description
WA Chem OCSR Mobile is the Apple local-recognition model package repository for
WA Chem. The model task is image-to-text: convert a chemical structure image
into SMILES/E-SMILES-compatible tokens that WA Chem can convert back into an
editable molecule.
This repository is reserved for the current best validated WA Chem Apple OCSR
package. No production `current/` model package is accepted yet; the active
server6 run is still a baseline candidate.
All WA Chem OCSR Mobile weights accepted into this repository are trained from
scratch by WA Chem. They are not fine-tuned from MolParser-7M, MolGallery, or
any other non-commercial upstream checkpoint. Training uses only data that WA
Chem has cleared for commercial use.
## Intended Usage and Applicable Scenarios
- Local OCSR inside the WA Chem Apple app for iPhone, iPad, and Mac.
- Printed chemical structures, screenshots, mobile photos, and hand-drawn/sketch
  inputs after frozen-set evaluation.
- Replacement-compatible exports for the current WA Chem Apple runtime.
This repository is not the training dataset. The related dataset repository is
`huluxiaohuowa/WA-Chem-OCSR-Mobile-Dataset`:
https://www.modelscope.cn/datasets/huluxiaohuowa/WA-Chem-OCSR-Mobile-Dataset
### How to Use
Accepted packages must be published under `current/` with this layout:
- `current/manifest.json`
- `current/tokenizer/vocab.txt`
- `current/tokenizer/tokenizer_config.json`
- `current/rec/MolParserMobileEncoder.mlpackage/`
- `current/rec/MolParserMobileDecoderStep.mlpackage/`
- `current/eval-report.json`
- `current/SHA256SUMS.txt`
The WA Chem Apple app loads the Core ML encoder and decoder-step packages from
that layout. Do not use an intermediate checkpoint directly in the app bundle.
Runtime interface:
- image input: RGB 224 × 224, `/255`, ImageNet mean/std normalization;
- encoder: `pixel_values` → `enc_hidden`;
- decoder IDs: `decoder_start_token_id=0`, `pad_token_id=1`, `eos_token_id=2`;
- maximum decoded length: 256;
- client result: recoverable `molblock` or `canonical_smiles`.
## Repository Layout
- `code/` — training, evaluation, data-preparation, and Core ML conversion code
  snapshot, kept in sync with the WA Chem source repository:
  - `train_molparser_mobile.py` — MolParser-Mobile-compatible training entry
    point (official processor/tokenizer boundary, per-epoch checkpoints);
  - `evaluate_molparser_mobile.py` — official-architecture evaluator (eval
    loss, valid SMILES, token exact, canonical exact, frozen slices);
  - `prepare_mixed_manifest.py` — gated mixed training manifest builder
    (existence sampling, tokenizer round-trip sampling, license checks);
  - `make_diverse_synthetic_data.py` — styled synthetic corpus generator;
  - `make_pubchem_data.py` / `make_decimer_handdrawn_data.py` — source data
    preparation;
  - `prepare_modelscope_dataset.py` / `prepare_modelscope_snapshot.py` —
    dataset packaging;
  - `coreml_export_compat.py` + `export_molparser_mobile_coreml.py` — Core ML
    export (TorchScript trace, static 256-slot sliding-window KV decoder,
    transformers 4.51/coremltools 8.3 compatible);
  - `render.py` / `tokenizer.py` / `model.py` / `__init__.py` — shared modules.
- `current/` — (planned) app-consumable runtime package: Core ML encoder +
  decoder-step, detector, tokenizer, manifest, checksums, eval report.
- `pytorch/` — (planned) training-format weights (`hf-last`: safetensors +
  remote code + processor).
- `coreml/` — (planned) raw Core ML export bundle.
- `docs/` — operation guides: `ocsr-training-guide.md` (how to train on the
  current 7.9M commercial-clean dataset, gates, NVMe data layout, evaluation)
  and `ocsr-coreml-conversion.md` (how to convert the trained checkpoint into
  the Core ML runtime package, environment, contract, verification).

`current/` and `coreml/` artifacts are exported from the exact `pytorch/`
checkpoint identified in `manifest.json`. The validated conversion environment
is coremltools 8.3.0 + torch 2.7.1 + transformers 4.51.3 (TorchScript trace,
static 256-slot sliding-window KV decoder, FLOAT32 compute). Weights are NOT
published until frozen-set evaluation passes.
## Model Training
### Training Data Introduction
Training data must come from commercial-clean molecule labels and images,
including generated PubChem/RDKit-style renders, licensed handwritten examples,
screenshots, mobile-photo crops, and frozen evaluation slices. Non-commercial
MolParser-7M or MolGallery data must not be used for WA Chem commercial Apple
distribution unless a separate license is obtained.
The intended production model lineage is therefore fully WA Chem-owned: start
from randomly initialized trainable weights, train only on the commercial-clean
WA Chem dataset above, evaluate against frozen WA Chem slices, and publish only
validated Core ML/PyTorch-compatible artifacts.
### Training
Training runs on server6 with two NVIDIA RTX A5500 GPUs using the official
MolParser-Mobile processor/tokenizer boundary, batch size 512, max decoded
length 256. The 20-epoch PubChem/RDKit baseline is complete. A mixed-data
continuation is in progress on 7.9M commercial-clean samples (styled synthetic
renders in six visual styles, clean PubChem renders, DECIMER hand-drawn,
Markush/E-SMILES templates) with a gated manifest (sampled existence checks,
official-tokenizer round-trip sampling, license checks) on NVMe-backed storage,
followed by frozen-slice evaluation before any release.
## Evaluation and Results
No accepted production metrics are published yet. The baseline checkpoint
evaluated at valid SMILES 0.163 / token exact 0.0 and was rejected; the
mixed-data continuation must show substantial valid-SMILES and canonical-exact
improvement on held-out frozen slices before it can replace the baseline.
A candidate can replace the Apple app model only after:
- held-out evaluation reports valid-SMILES rate and canonical-SMILES exact match;
- frozen printed/screenshot/mobile-photo/hand-drawn slices do not regress;
- Core ML export passes manifest and checksum validation;
- the Apple app can insert recognized output as editable WA Chem structure.
## Model Limitations and Potential Biases
The current repository is a reserved package location. Until an evaluated
`current/` package is published, do not treat it as a usable production OCSR
model.
