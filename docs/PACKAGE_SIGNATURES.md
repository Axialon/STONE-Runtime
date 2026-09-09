> Accepted verification scope: full clean candidate passed750 distinct Node cases and211 sandboxed Chrome cases, including real CLI output-failure integration and signature roundtrips. This optional feature establishes signature/key consistency only; no publisher identity, trust-root enrollment or execution authorization is conferred. See evidence/PACKAGE_SIGNATURES_V0_1.md.

# Detached package signatures

A package hash does not identify a publisher. This optional check verifies exact package bytes against an included Ed25519 public key. An independently obtained, operator-entered fingerprint can establish key equality only. Neither result establishes a person's identity, publisher authority, a trusted root, or permission to execute. Existing package admission and provider availability remain unchanged, including for correctly signed unknown runtimes.

## Byte contract

`packages/contract/package-signature.mjs` uses standard WebCrypto Ed25519 and SHA-256, without dependencies or custom cryptographic mathematics. It signs PureEd25519 over the UTF-8 bytes of `STONE-PACKAGE-SIGNATURE/0.1\n` (the final character is LF) followed by the **exact original package bytes**. This is a versioned Stone message domain, not Ed25519ctx or Ed25519ph. The Stone envelope itself is a project format, not a standardized envelope.

The original UTF-8 package must pass `readStonePackage`; its 256 KiB bound, manifest validation, identifier-only runtime requirements, and artifact bounds/checksums are retained. JSON is never reserialized for signing. Newlines, whitespace, Unicode, and member ordering affect the package signature. Byte inputs are copied before asynchronous operations. UTF-8 decoding is fatal on malformed sequences; BOM-prefixed JSON is rejected, not silently stripped.

Detached UTF-8 JSON is at most 8 KiB and has exactly these five members:

| Member | Required value |
| --- | --- |
| `format` | `stone.package-signature/0.1` |
| `algorithm` | `Ed25519` |
| `packageSha256` | SHA-256 of original package bytes, 64 lowercase hexadecimal characters |
| `publicKey` | Raw 32-byte public key, canonical padded base64 (44 characters) |
| `signature` | Raw 64-byte signature, canonical padded base64 (88 characters) |

Unknown members, duplicate envelope members, versions, algorithms, noncanonical encodings, and invalid packages reject before Ed25519 operations. Package/artifact validation uses the existing SHA-256 checks. Envelope formatting may vary; its own byte count and SHA-256 record exactly what was supplied. The domain binds the package; the envelope metadata is constrained by the verifier, not itself signed.

`verifyPackageSignature` returns a public report with `package` and `envelope` byte/hash receipts, `signatureValid`, `publicKeyFingerprint`, `expectedKeyMatch`, and a status. Fingerprints hash the raw public key. Only the optional expected fingerprint is normalized by trimming surrounding whitespace and lowercasing hexadecimal letters. Empty/whitespace means absent; any other non-64-hex input fails.

Statuses distinguish `verified`, `package-hash-mismatch`, `signature-invalid`, `expected-key-mismatch`, `malformed-package`, `malformed-envelope`, `invalid-expected-key`, and `crypto-unavailable`. `signatureValid` requires the declared package digest to agree as well as a successful Ed25519 verification. A wrong expected key leaves a mathematically valid signature valid but fails the overall check. Null fields mean absent or not evaluated; malformed input is never echoed. Validated public envelope data appears in `receipt`. Every report says `publisherIdentity: "not-established"`, `installation: "not-performed"`, and `executionAdmission: "unchanged"`.

## Digital panel

The default-collapsed **Package signature check** panel sits alongside Data Lab and AUDIT. Choose a package and a detached receipt, optionally enter an independently obtained fingerprint, then press **Verify**. Nothing verifies on file selection. Files remain local. The panel has no secret input, persistence, trust store, default publisher key, or network operation.

File sizes are checked before and after reading. Verification runs in a fresh owned module worker with a 10-second deadline. Completion, failure, input change, native cancel, Stop/clear, host leave, and pagehide terminate pending verification. Generation checks discard late file reads and worker results. Changed input immediately clears the previous report and export. Stop/clear also clears both file selections and the expected fingerprint. Worker deadlines begin after file reading; Stop/clear can invalidate a stalled read. Public report details are separately collapsed and rendered as inert text. Export writes only the current public report.

Required IDs: `signature-panel`, `signature-package-file`, `signature-file`, `signature-expected-key`, `signature-verify`, `signature-cancel`, `signature-status`, `signature-report`, `signature-export`. Additional IDs: `signature-key-help` (fingerprint instructions), `signature-key-state` (key comparison/fingerprint), `signature-details` (collapsed public report). The browser suite includes keyboard use and 320/390px layouts; these checks passed in the tested sandboxed Chrome environment; other browsers/devices remain unverified.

## External author CLI

Node 22+ with WebCrypto Ed25519 is required. The caller supplies a legitimate Ed25519 PKCS8 PEM **only on stdin**, for example through their own explicitly chosen input stream:

```sh
node scripts/stone-signature.mjs sign --package package.stone.json
node scripts/stone-signature.mjs verify --package package.stone.json --signature detached-signature.json
node scripts/stone-signature.mjs verify --package package.stone.json --signature detached-signature.json --expected-key HEX_FINGERPRINT
```

The `sign` command expects piped/redirected stdin, refuses an interactive terminal, and prints a public detached JSON envelope to stdout. It never finds, generates, persists, or overwrites a signing key or output file. No key argument or environment variable is accepted. Stdin is limited to 16 KiB and 10 seconds; only unencrypted Ed25519 PKCS8 PEM is accepted. Node `createPrivateKey`/`createPublicKey` derive the public key; WebCrypto imports/signs through the shared implementation. Temporary mutable key buffers are cleared; JavaScript/Node do not guarantee erasure of all internal copies. Output writes are awaited through their callbacks, with stream error listeners retained to handle subsequent error events. Output failure returns exit 2 with a generic diagnostic; a failed diagnostic stream is handled without another write. Pipe output is not atomic and can be partial. Errors do not print key material or input paths.

File reads require bounded, nonempty regular files and check actual bytes. Duplicate/unknown flags fail. Exit codes: 0 successful check/signing; 1 malformed/invalid/mismatched verification report; 2 command, file, stdin, or signing failure; 3 verification crypto unavailable. No real signing keys were used to implement or test this feature. Ownership, rotation, revocation, publisher identity, and executable enforcement require separate design and authorization.

## Verification and references

`npm run verify:signatures` runs direct primitive, package, lifecycle, and CLI-helper tests. `npm run verify:signatures:cli` runs the separate subprocess CLI tests. `npm run verify:signatures:browser` runs browser coverage, including a real module worker deliberately stuck in an infinite loop. The direct signature tests already run through `npm test` in `verify:full`; the standalone command remains available without a redundant full-suite invocation. The separate subprocess and browser gates remain in `verify:full`; no tests were removed. Tests generate ephemeral keys in memory only. The public RFC vector tests the primitive with an empty message; Stone roundtrips separately test the domain prefix.

Primary references supplied for this implementation (not fetched during native work):

- [W3C Web Cryptography API](https://www.w3.org/TR/webcrypto/) — Ed25519 import, sign, verify.
- [Node 22.20.0 WebCrypto](https://nodejs.org/download/release/v22.20.0/docs/api/webcrypto.html) — Ed25519 and raw/PKCS8 formats.
- [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html) — Ed25519 and test 1. This is an informational RFC, not an IETF standards-track claim.
