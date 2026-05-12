/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/rein.json`.
 */
export type Rein = {
  "address": "2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj",
  "metadata": {
    "name": "rein",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "REIN — on-chain spending guardrail for AI agents"
  },
  "instructions": [
    {
      "name": "approveStepUp",
      "discriminator": [
        161,
        230,
        162,
        156,
        84,
        76,
        25,
        211
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          },
          "relations": [
            "stepUpRequest"
          ]
        },
        {
          "name": "stepUpRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  101,
                  112,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "step_up_request.nonce",
                "account": "stepUpRequest"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "usdcMint",
          "relations": [
            "vault"
          ]
        },
        {
          "name": "ownerUsdcAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vaultUsdcAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "dispute",
      "discriminator": [
        216,
        92,
        128,
        146,
        202,
        85,
        135,
        73
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          },
          "relations": [
            "receipt",
            "blocklist"
          ]
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "arg",
                "path": "args.nonce"
              }
            ]
          }
        },
        {
          "name": "blocklist",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  111,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "disputeArgs"
            }
          }
        }
      ]
    },
    {
      "name": "expirePolicy",
      "discriminator": [
        149,
        24,
        43,
        100,
        240,
        50,
        39,
        124
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              }
            ]
          },
          "relations": [
            "policy"
          ]
        },
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "initPolicy",
      "discriminator": [
        45,
        234,
        110,
        100,
        209,
        146,
        191,
        86
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "blocklist",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  111,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "policyArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initVault",
      "discriminator": [
        77,
        79,
        85,
        150,
        33,
        217,
        52,
        106
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "vaultUsdcAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "pause",
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault",
            "policy"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          },
          "relations": [
            "policy"
          ]
        },
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "pauseArgs"
            }
          }
        }
      ]
    },
    {
      "name": "requestStepUp",
      "discriminator": [
        100,
        112,
        173,
        34,
        64,
        246,
        32,
        13
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              }
            ]
          },
          "relations": [
            "policy"
          ]
        },
        {
          "name": "policy",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "stepUpRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  101,
                  112,
                  117,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "arg",
                "path": "args.nonce"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "stepUpRequestArgs"
            }
          }
        }
      ]
    },
    {
      "name": "spend",
      "discriminator": [
        242,
        205,
        255,
        87,
        101,
        217,
        245,
        57
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              }
            ]
          },
          "relations": [
            "policy",
            "blocklist"
          ]
        },
        {
          "name": "policy",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "vaultUsdcAta",
          "writable": true
        },
        {
          "name": "recipientUsdcAta",
          "writable": true
        },
        {
          "name": "dailyCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "arg",
                "path": "args.day"
              }
            ]
          }
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "arg",
                "path": "args.nonce"
              }
            ]
          }
        },
        {
          "name": "blocklist",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  111,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        },
        {
          "name": "stepUpRequest",
          "docs": [
            "Optional. Required when `args.amount > policy.step_up_threshold`.",
            "PDA derivation + (vault, amount, recipient, nonce) match validated inside the handler",
            "(Anchor's `seeds`/`bump` macros don't compose cleanly with `Option<Box<Account<T>>>`,",
            "so we re-derive manually below — same security property, just expressed in code)."
          ],
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "spendArgs"
            }
          }
        }
      ]
    },
    {
      "name": "updatePolicy",
      "discriminator": [
        212,
        245,
        246,
        7,
        163,
        151,
        18,
        57
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault",
            "policy"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          },
          "relations": [
            "policy"
          ]
        },
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "vault"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "policyArgs"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "blocklist",
      "discriminator": [
        216,
        198,
        123,
        217,
        82,
        83,
        57,
        2
      ]
    },
    {
      "name": "dailyCounter",
      "discriminator": [
        93,
        18,
        156,
        84,
        91,
        233,
        198,
        144
      ]
    },
    {
      "name": "policy",
      "discriminator": [
        222,
        135,
        7,
        163,
        235,
        177,
        33,
        68
      ]
    },
    {
      "name": "spendReceipt",
      "discriminator": [
        207,
        125,
        115,
        86,
        146,
        63,
        159,
        207
      ]
    },
    {
      "name": "stepUpRequest",
      "discriminator": [
        97,
        246,
        158,
        191,
        139,
        226,
        226,
        223
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "events": [
    {
      "name": "depositMade",
      "discriminator": [
        210,
        201,
        130,
        183,
        244,
        203,
        155,
        199
      ]
    },
    {
      "name": "policyExpired",
      "discriminator": [
        165,
        34,
        27,
        82,
        79,
        188,
        9,
        244
      ]
    },
    {
      "name": "policyInitialized",
      "discriminator": [
        102,
        184,
        59,
        178,
        235,
        69,
        251,
        181
      ]
    },
    {
      "name": "policyPauseChanged",
      "discriminator": [
        206,
        171,
        233,
        72,
        191,
        181,
        210,
        16
      ]
    },
    {
      "name": "policyUpdated",
      "discriminator": [
        225,
        112,
        112,
        67,
        95,
        236,
        245,
        161
      ]
    },
    {
      "name": "spendCompleted",
      "discriminator": [
        211,
        28,
        245,
        115,
        108,
        249,
        38,
        50
      ]
    },
    {
      "name": "spendDisputed",
      "discriminator": [
        183,
        115,
        72,
        157,
        181,
        8,
        56,
        228
      ]
    },
    {
      "name": "stepUpApproved",
      "discriminator": [
        94,
        77,
        27,
        166,
        85,
        225,
        64,
        39
      ]
    },
    {
      "name": "stepUpRequested",
      "discriminator": [
        76,
        171,
        28,
        46,
        122,
        234,
        212,
        23
      ]
    },
    {
      "name": "vaultInitialized",
      "discriminator": [
        180,
        43,
        207,
        2,
        18,
        71,
        3,
        75
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "errAmountZero",
      "msg": "amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "errNotVaultOwner",
      "msg": "vault owner does not match signer"
    },
    {
      "code": 6002,
      "name": "errMintMismatch",
      "msg": "usdc mint does not match vault binding"
    },
    {
      "code": 6003,
      "name": "errUnauthorized",
      "msg": "signer is not authorized for this policy"
    },
    {
      "code": 6004,
      "name": "errAllowlistTooLong",
      "msg": "allowlist exceeds max size of 16"
    },
    {
      "code": 6005,
      "name": "errInvalidPolicy",
      "msg": "policy invariants violated (per_tx_cap > 0; daily_cap >= per_tx_cap)"
    },
    {
      "code": 6006,
      "name": "errVersionOverflow",
      "msg": "policy version overflow"
    },
    {
      "code": 6007,
      "name": "errExpired",
      "msg": "policy expired or expiry in the past"
    },
    {
      "code": 6008,
      "name": "errPerTxCap",
      "msg": "amount exceeds per-transaction cap"
    },
    {
      "code": 6009,
      "name": "errDailyCap",
      "msg": "amount would exceed daily cap"
    },
    {
      "code": 6010,
      "name": "errRecipientNotAllowed",
      "msg": "recipient is not in policy allowlist"
    },
    {
      "code": 6011,
      "name": "errPaused",
      "msg": "vault is paused"
    },
    {
      "code": 6012,
      "name": "errStepUpRequired",
      "msg": "amount exceeds step-up threshold; owner approval required"
    },
    {
      "code": 6013,
      "name": "errOverflow",
      "msg": "arithmetic overflow"
    },
    {
      "code": 6014,
      "name": "errCounterDayMismatch",
      "msg": "daily counter day mismatch"
    },
    {
      "code": 6015,
      "name": "errStepUpNotNeeded",
      "msg": "amount is below step-up threshold; request not needed"
    },
    {
      "code": 6016,
      "name": "errStepUpExpired",
      "msg": "step-up request expired"
    },
    {
      "code": 6017,
      "name": "errStepUpMismatch",
      "msg": "step-up approval does not match this spend (vault/amount/recipient/nonce)"
    },
    {
      "code": 6018,
      "name": "errStepUpTtlInvalid",
      "msg": "ttl_secs must be > 0 and <= 86400"
    },
    {
      "code": 6019,
      "name": "errBlocklistFull",
      "msg": "blocklist is full (max 8)"
    },
    {
      "code": 6020,
      "name": "errRecipientBlocked",
      "msg": "recipient is blocked by a prior dispute"
    },
    {
      "code": 6021,
      "name": "errNotExpiring",
      "msg": "policy has no expiry; cannot force-expire"
    },
    {
      "code": 6022,
      "name": "errNotExpired",
      "msg": "policy has not yet reached its expiry"
    }
  ],
  "types": [
    {
      "name": "blocklist",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "len",
            "type": "u8"
          },
          {
            "name": "entries",
            "type": {
              "array": [
                "pubkey",
                8
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "dailyCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "day",
            "type": "u64"
          },
          {
            "name": "spent",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "depositMade",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "disputeArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nonce",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pauseArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "policy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "version",
            "type": "u32"
          },
          {
            "name": "dailyCap",
            "type": "u64"
          },
          {
            "name": "perTxCap",
            "type": "u64"
          },
          {
            "name": "stepUpThreshold",
            "type": "u64"
          },
          {
            "name": "expiryTs",
            "type": "i64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "allowlistLen",
            "type": "u8"
          },
          {
            "name": "allowlist",
            "type": {
              "array": [
                "pubkey",
                16
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "policyArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dailyCap",
            "type": "u64"
          },
          {
            "name": "perTxCap",
            "type": "u64"
          },
          {
            "name": "stepUpThreshold",
            "type": "u64"
          },
          {
            "name": "expiryTs",
            "type": "i64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "allowlist",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "policyExpired",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "expiredAt",
            "type": "i64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "policyInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "version",
            "type": "u32"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "policyPauseChanged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "policyUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "fromVersion",
            "type": "u32"
          },
          {
            "name": "toVersion",
            "type": "u32"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "spendArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "x402UrlHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "day",
            "docs": [
              "Day index (unix_ts / 86_400) used to derive the daily counter PDA.",
              "Caller computes this client-side and passes it; the handler verifies it",
              "matches the on-chain clock to within ±1 day (boundary tolerance)."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "spendCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "receipt",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "policyVersion",
            "type": "u32"
          },
          {
            "name": "day",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "spendDisputed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "receipt",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "spendReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "ts",
            "type": "i64"
          },
          {
            "name": "policyVersion",
            "type": "u32"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "x402UrlHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "disputed",
            "type": "bool"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                31
              ]
            }
          }
        ]
      }
    },
    {
      "name": "stepUpApproved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "request",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stepUpRequest",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stepUpRequestArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "ttlSecs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stepUpRequested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "request",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "vaultInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "blocklistSeed",
      "type": "bytes",
      "value": "[98, 108, 111, 99, 107, 108, 105, 115, 116]"
    },
    {
      "name": "counterSeed",
      "type": "bytes",
      "value": "[99, 111, 117, 110, 116, 101, 114]"
    },
    {
      "name": "policySeed",
      "type": "bytes",
      "value": "[112, 111, 108, 105, 99, 121]"
    },
    {
      "name": "receiptSeed",
      "type": "bytes",
      "value": "[114, 101, 99, 101, 105, 112, 116]"
    },
    {
      "name": "stepUpSeed",
      "type": "bytes",
      "value": "[115, 116, 101, 112, 117, 112]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
