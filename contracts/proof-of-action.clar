;; Proof-of-Action Receipt Contract
;; Bitcoin-anchored timestamped proof submissions on Stacks

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-insufficient-fee (err u100))
(define-constant err-transfer-failed (err u101))
(define-constant err-invalid-hash (err u102))

;; Fee amount in microSTX (0.001 STX = 1000 microSTX)
(define-constant submission-fee u1000)

;; Data vars
(define-data-var total-submissions uint u0)

;; Read-only functions
(define-read-only (get-fee)
  submission-fee
)

(define-read-only (get-total-submissions)
  (var-get total-submissions)
)

(define-read-only (get-contract-owner)
  contract-owner
)

;; Public functions

;; Submit a proof hash (32 bytes, typically SHA-256)
;; User pays the submission fee which goes to contract owner
(define-public (submit-proof (hash (buff 32)))
  (let
    (
      (current-height block-height)
      (submission-count (+ (var-get total-submissions) u1))
    )
    ;; Validate hash is not empty
    (asserts! (> (len hash) u0) err-invalid-hash)
    
    ;; Transfer fee to contract owner
    (try! (stx-transfer? submission-fee tx-sender contract-owner))
    
    ;; Update submission counter
    (var-set total-submissions submission-count)
    
    ;; Emit structured print event for Chainhook indexing
    (print {
      event: "proof-submitted",
      user: tx-sender,
      hash: hash,
      block-height: current-height,
      submission-id: submission-count
    })
    
    ;; Return success with submission ID
    (ok submission-count)
  )
)
