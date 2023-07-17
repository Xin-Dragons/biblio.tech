export type Citrus = {
  version: "0.1.0"
  name: "citrus"
  instructions: [
    {
      name: "createConfig"
      accounts: [
        {
          name: "collectionConfig"
          isMut: true
          isSigner: true
        },
        {
          name: "admin"
          isMut: true
          isSigner: true
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "collectionKey"
          type: {
            option: "publicKey"
          }
        },
        {
          name: "creators"
          type: {
            option: {
              array: ["publicKey", 3]
            }
          }
        },
        {
          name: "merkleRoot"
          type: {
            option: {
              array: ["u8", 32]
            }
          }
        },
        {
          name: "feeReduction"
          type: {
            option: "u16"
          }
        }
      ]
    },
    {
      name: "updateConfig"
      accounts: [
        {
          name: "collectionConfig"
          isMut: true
          isSigner: false
        },
        {
          name: "admin"
          isMut: true
          isSigner: true
        }
      ]
      args: [
        {
          name: "collectionKey"
          type: {
            option: "publicKey"
          }
        },
        {
          name: "creators"
          type: {
            option: {
              array: ["publicKey", 3]
            }
          }
        },
        {
          name: "merkleRoot"
          type: {
            option: {
              array: ["u8", 32]
            }
          }
        },
        {
          name: "feeReduction"
          type: {
            option: "u16"
          }
        }
      ]
    },
    {
      name: "offerLoan"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: true
        },
        {
          name: "lendAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: true
        },
        {
          name: "collectionConfig"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "terms"
          type: {
            defined: "LoanTerms"
          }
        },
        {
          name: "borrower"
          type: {
            option: "publicKey"
          }
        },
        {
          name: "offerType"
          type: {
            defined: "OfferType"
          }
        },
        {
          name: "ltvTerms"
          type: {
            option: {
              defined: "LtvTerms"
            }
          }
        },
        {
          name: "mint"
          type: {
            option: "publicKey"
          }
        }
      ]
    },
    {
      name: "cancelOffer"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "lendAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: true
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "lend"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "lendAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: false
        },
        {
          name: "collectionConfig"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "terms"
          type: {
            defined: "LoanTerms"
          }
        },
        {
          name: "mint"
          type: "publicKey"
        }
      ]
    },
    {
      name: "requestLoan"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: true
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "collectionConfig"
          isMut: false
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "terms"
          type: {
            defined: "LoanTerms"
          }
        },
        {
          name: "merkleData"
          type: {
            option: {
              defined: "MerkleData"
            }
          }
        }
      ]
    },
    {
      name: "cancelRequest"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "borrow"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "lendAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "collectionConfig"
          isMut: false
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "lender"
          isMut: true
          isSigner: false
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        },
        {
          name: "fpAuthority"
          isMut: false
          isSigner: true
        }
      ]
      args: [
        {
          name: "merkleData"
          type: {
            option: {
              defined: "MerkleData"
            }
          }
        },
        {
          name: "terms"
          type: {
            defined: "LoanTerms"
          }
        },
        {
          name: "floor"
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "repay"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "treasury"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: false
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "claim"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: true
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "lenderTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "lenderTokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        },
        {
          name: "associatedTokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    },
    {
      name: "reborrow"
      accounts: [
        {
          name: "activeLoanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "activeLendAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "activeBorrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "activeLender"
          isMut: true
          isSigner: false
        },
        {
          name: "newLoanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "newLendAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "newBorrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "newCollectionConfig"
          isMut: false
          isSigner: false
        },
        {
          name: "newLender"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "treasury"
          isMut: true
          isSigner: false
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        },
        {
          name: "citrusProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "fpAuthority"
          isMut: false
          isSigner: true
        }
      ]
      args: [
        {
          name: "merkleData"
          type: {
            option: {
              defined: "MerkleData"
            }
          }
        },
        {
          name: "terms"
          type: {
            defined: "LoanTerms"
          }
        },
        {
          name: "floor"
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "mortgage"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "lendAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "collectionConfig"
          isMut: false
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "lender"
          isMut: true
          isSigner: false
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        },
        {
          name: "fpAuthority"
          isMut: false
          isSigner: true
        }
      ]
      args: [
        {
          name: "merkleData"
          type: {
            option: {
              defined: "MerkleData"
            }
          }
        },
        {
          name: "terms"
          type: {
            defined: "LoanTerms"
          }
        },
        {
          name: "cpis"
          type: {
            vec: {
              defined: "Cpi"
            }
          }
        },
        {
          name: "floor"
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "sellRepay"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "treasury"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: false
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "cpis"
          type: {
            vec: {
              defined: "Cpi"
            }
          }
        }
      ]
    },
    {
      name: "listCollateral"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        },
        {
          name: "associatedTokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "cpis"
          type: {
            vec: {
              defined: "Cpi"
            }
          }
        }
      ]
    },
    {
      name: "delistCollateral"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: true
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        },
        {
          name: "associatedTokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "cpis"
          type: {
            vec: {
              defined: "Cpi"
            }
          }
        }
      ]
    },
    {
      name: "claimListedNft"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: true
        },
        {
          name: "borrower"
          isMut: true
          isSigner: false
        },
        {
          name: "mint"
          isMut: false
          isSigner: false
        },
        {
          name: "lenderTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "masterEdition"
          isMut: false
          isSigner: false
        },
        {
          name: "metadata"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthTokenRecord"
          isMut: true
          isSigner: false
        },
        {
          name: "tokenProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "tokenMetadataProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "sysvarInstructions"
          isMut: false
          isSigner: false
        },
        {
          name: "authorizationRulesProgram"
          isMut: false
          isSigner: false
        },
        {
          name: "rules"
          isMut: false
          isSigner: false
        },
        {
          name: "associatedTokenProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: "cpis"
          type: {
            vec: {
              defined: "Cpi"
            }
          }
        }
      ]
    },
    {
      name: "settleSale"
      accounts: [
        {
          name: "loanAccount"
          isMut: true
          isSigner: false
        },
        {
          name: "borrowAuthority"
          isMut: true
          isSigner: false
        },
        {
          name: "borrower"
          isMut: true
          isSigner: false
        },
        {
          name: "treasury"
          isMut: true
          isSigner: false
        },
        {
          name: "lender"
          isMut: true
          isSigner: false
        },
        {
          name: "systemProgram"
          isMut: false
          isSigner: false
        }
      ]
      args: []
    }
  ]
  accounts: [
    {
      name: "collectionConfig"
      type: {
        kind: "struct"
        fields: [
          {
            name: "collectionKey"
            type: {
              option: "publicKey"
            }
          },
          {
            name: "creators"
            type: {
              option: {
                array: ["publicKey", 3]
              }
            }
          },
          {
            name: "merkleRoot"
            type: {
              option: {
                array: ["u8", 32]
              }
            }
          },
          {
            name: "feeReduction"
            type: {
              option: "u16"
            }
          }
        ]
      }
    },
    {
      name: "loan"
      type: {
        kind: "struct"
        fields: [
          {
            name: "bump"
            type: "u8"
          },
          {
            name: "lender"
            type: "publicKey"
          },
          {
            name: "borrower"
            type: "publicKey"
          },
          {
            name: "mint"
            type: "publicKey"
          },
          {
            name: "collectionConfig"
            type: "publicKey"
          },
          {
            name: "status"
            type: {
              defined: "LoanStatus"
            }
          },
          {
            name: "loanTerms"
            type: {
              defined: "LoanTerms"
            }
          },
          {
            name: "creationTime"
            type: "i64"
          },
          {
            name: "startTime"
            type: "i64"
          },
          {
            name: "endTime"
            type: "i64"
          },
          {
            name: "fox"
            type: "bool"
          },
          {
            name: "mortgage"
            type: "bool"
          },
          {
            name: "private"
            type: "bool"
          },
          {
            name: "offerType"
            type: {
              defined: "OfferType"
            }
          },
          {
            name: "listingPrice"
            type: "u64"
          },
          {
            name: "ltvTerms"
            type: {
              option: {
                defined: "LtvTerms"
              }
            }
          }
        ]
      }
    },
    {
      name: "borrowAuthority"
      type: {
        kind: "struct"
        fields: []
      }
    }
  ]
  types: [
    {
      name: "LoanTerms"
      type: {
        kind: "struct"
        fields: [
          {
            name: "apyBps"
            type: "u64"
          },
          {
            name: "duration"
            type: "u64"
          },
          {
            name: "principal"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "LtvTerms"
      type: {
        kind: "struct"
        fields: [
          {
            name: "ltvBps"
            type: "u64"
          },
          {
            name: "maxOffer"
            type: "u64"
          }
        ]
      }
    },
    {
      name: "MerkleData"
      type: {
        kind: "struct"
        fields: [
          {
            name: "index"
            type: "u64"
          },
          {
            name: "proof"
            type: {
              vec: {
                array: ["u8", 32]
              }
            }
          }
        ]
      }
    },
    {
      name: "Cpi"
      type: {
        kind: "struct"
        fields: [
          {
            name: "data"
            type: "bytes"
          },
          {
            name: "numAccounts"
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LoanStatus"
      type: {
        kind: "enum"
        variants: [
          {
            name: "WaitingForBorrower"
          },
          {
            name: "WaitingForLender"
          },
          {
            name: "Active"
          },
          {
            name: "Repaid"
          },
          {
            name: "Defaulted"
          },
          {
            name: "OnSale"
          }
        ]
      }
    },
    {
      name: "OfferType"
      type: {
        kind: "enum"
        variants: [
          {
            name: "Global"
          },
          {
            name: "Mortgage"
          },
          {
            name: "Borrow"
          }
        ]
      }
    }
  ]
  events: [
    {
      name: "LoanUpdate"
      fields: [
        {
          name: "loanAccount"
          type: "publicKey"
          index: false
        },
        {
          name: "lender"
          type: "publicKey"
          index: false
        },
        {
          name: "borrower"
          type: "publicKey"
          index: false
        },
        {
          name: "mint"
          type: "publicKey"
          index: false
        },
        {
          name: "collectionConfig"
          type: "publicKey"
          index: false
        },
        {
          name: "status"
          type: {
            defined: "LoanStatus"
          }
          index: false
        },
        {
          name: "loanTerms"
          type: {
            defined: "LoanTerms"
          }
          index: false
        },
        {
          name: "creationTime"
          type: "i64"
          index: false
        },
        {
          name: "startTime"
          type: "i64"
          index: false
        },
        {
          name: "endTime"
          type: "i64"
          index: false
        },
        {
          name: "fox"
          type: "bool"
          index: false
        },
        {
          name: "tokenAccount"
          type: {
            option: "publicKey"
          }
          index: false
        },
        {
          name: "rulesAcc"
          type: {
            option: "publicKey"
          }
          index: false
        },
        {
          name: "mortgage"
          type: "bool"
          index: false
        },
        {
          name: "private"
          type: "bool"
          index: false
        },
        {
          name: "offerType"
          type: {
            defined: "OfferType"
          }
          index: false
        },
        {
          name: "listingPrice"
          type: "u64"
          index: false
        },
        {
          name: "ltvTerms"
          type: {
            option: {
              defined: "LtvTerms"
            }
          }
          index: false
        }
      ]
    },
    {
      name: "LoanCancelled"
      fields: [
        {
          name: "loanAccount"
          type: "publicKey"
          index: false
        }
      ]
    }
  ]
  errors: [
    {
      code: 6000
      name: "InvalidTerms"
    },
    {
      code: 6001
      name: "InvalidMint"
    },
    {
      code: 6002
      name: "LoanActive"
    },
    {
      code: 6003
      name: "LoanInactive"
    },
    {
      code: 6004
      name: "LoanNotAvailable"
    },
    {
      code: 6005
      name: "LoanNotOpen"
    },
    {
      code: 6006
      name: "InvalidCollectionNFT"
    },
    {
      code: 6007
      name: "InvalidMerkleNFT"
    },
    {
      code: 6008
      name: "CalculationError"
    },
    {
      code: 6009
      name: "MinimumOfferPrice"
    },
    {
      code: 6010
      name: "InvalidBorrower"
    },
    {
      code: 6011
      name: "InvalidMarketplace"
    },
    {
      code: 6012
      name: "InvalidOfferType"
    },
    {
      code: 6013
      name: "InvalidCpi"
    },
    {
      code: 6014
      name: "InsufficientBalance"
    }
  ]
}

export const IDL: Citrus = {
  version: "0.1.0",
  name: "citrus",
  instructions: [
    {
      name: "createConfig",
      accounts: [
        {
          name: "collectionConfig",
          isMut: true,
          isSigner: true,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "collectionKey",
          type: {
            option: "publicKey",
          },
        },
        {
          name: "creators",
          type: {
            option: {
              array: ["publicKey", 3],
            },
          },
        },
        {
          name: "merkleRoot",
          type: {
            option: {
              array: ["u8", 32],
            },
          },
        },
        {
          name: "feeReduction",
          type: {
            option: "u16",
          },
        },
      ],
    },
    {
      name: "updateConfig",
      accounts: [
        {
          name: "collectionConfig",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "collectionKey",
          type: {
            option: "publicKey",
          },
        },
        {
          name: "creators",
          type: {
            option: {
              array: ["publicKey", 3],
            },
          },
        },
        {
          name: "merkleRoot",
          type: {
            option: {
              array: ["u8", 32],
            },
          },
        },
        {
          name: "feeReduction",
          type: {
            option: "u16",
          },
        },
      ],
    },
    {
      name: "offerLoan",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: true,
        },
        {
          name: "lendAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: true,
        },
        {
          name: "collectionConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "terms",
          type: {
            defined: "LoanTerms",
          },
        },
        {
          name: "borrower",
          type: {
            option: "publicKey",
          },
        },
        {
          name: "offerType",
          type: {
            defined: "OfferType",
          },
        },
        {
          name: "ltvTerms",
          type: {
            option: {
              defined: "LtvTerms",
            },
          },
        },
        {
          name: "mint",
          type: {
            option: "publicKey",
          },
        },
      ],
    },
    {
      name: "cancelOffer",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lendAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "lend",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lendAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: false,
        },
        {
          name: "collectionConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "terms",
          type: {
            defined: "LoanTerms",
          },
        },
        {
          name: "mint",
          type: "publicKey",
        },
      ],
    },
    {
      name: "requestLoan",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: true,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "collectionConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "terms",
          type: {
            defined: "LoanTerms",
          },
        },
        {
          name: "merkleData",
          type: {
            option: {
              defined: "MerkleData",
            },
          },
        },
      ],
    },
    {
      name: "cancelRequest",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "borrow",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lendAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "collectionConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "fpAuthority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "merkleData",
          type: {
            option: {
              defined: "MerkleData",
            },
          },
        },
        {
          name: "terms",
          type: {
            defined: "LoanTerms",
          },
        },
        {
          name: "floor",
          type: {
            option: "u64",
          },
        },
      ],
    },
    {
      name: "repay",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "treasury",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "claim",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lenderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lenderTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "reborrow",
      accounts: [
        {
          name: "activeLoanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "activeLendAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "activeBorrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "activeLender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "newLoanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "newLendAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "newBorrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "newCollectionConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "newLender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "treasury",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "citrusProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "fpAuthority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "merkleData",
          type: {
            option: {
              defined: "MerkleData",
            },
          },
        },
        {
          name: "terms",
          type: {
            defined: "LoanTerms",
          },
        },
        {
          name: "floor",
          type: {
            option: "u64",
          },
        },
      ],
    },
    {
      name: "mortgage",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lendAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "collectionConfig",
          isMut: false,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "fpAuthority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "merkleData",
          type: {
            option: {
              defined: "MerkleData",
            },
          },
        },
        {
          name: "terms",
          type: {
            defined: "LoanTerms",
          },
        },
        {
          name: "cpis",
          type: {
            vec: {
              defined: "Cpi",
            },
          },
        },
        {
          name: "floor",
          type: {
            option: "u64",
          },
        },
      ],
    },
    {
      name: "sellRepay",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "treasury",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "cpis",
          type: {
            vec: {
              defined: "Cpi",
            },
          },
        },
      ],
    },
    {
      name: "listCollateral",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "cpis",
          type: {
            vec: {
              defined: "Cpi",
            },
          },
        },
      ],
    },
    {
      name: "delistCollateral",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "cpis",
          type: {
            vec: {
              defined: "Cpi",
            },
          },
        },
      ],
    },
    {
      name: "claimListedNft",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: true,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "lenderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "masterEdition",
          isMut: false,
          isSigner: false,
        },
        {
          name: "metadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthTokenRecord",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "sysvarInstructions",
          isMut: false,
          isSigner: false,
        },
        {
          name: "authorizationRulesProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rules",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "cpis",
          type: {
            vec: {
              defined: "Cpi",
            },
          },
        },
      ],
    },
    {
      name: "settleSale",
      accounts: [
        {
          name: "loanAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrowAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "borrower",
          isMut: true,
          isSigner: false,
        },
        {
          name: "treasury",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lender",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "collectionConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "collectionKey",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "creators",
            type: {
              option: {
                array: ["publicKey", 3],
              },
            },
          },
          {
            name: "merkleRoot",
            type: {
              option: {
                array: ["u8", 32],
              },
            },
          },
          {
            name: "feeReduction",
            type: {
              option: "u16",
            },
          },
        ],
      },
    },
    {
      name: "loan",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "lender",
            type: "publicKey",
          },
          {
            name: "borrower",
            type: "publicKey",
          },
          {
            name: "mint",
            type: "publicKey",
          },
          {
            name: "collectionConfig",
            type: "publicKey",
          },
          {
            name: "status",
            type: {
              defined: "LoanStatus",
            },
          },
          {
            name: "loanTerms",
            type: {
              defined: "LoanTerms",
            },
          },
          {
            name: "creationTime",
            type: "i64",
          },
          {
            name: "startTime",
            type: "i64",
          },
          {
            name: "endTime",
            type: "i64",
          },
          {
            name: "fox",
            type: "bool",
          },
          {
            name: "mortgage",
            type: "bool",
          },
          {
            name: "private",
            type: "bool",
          },
          {
            name: "offerType",
            type: {
              defined: "OfferType",
            },
          },
          {
            name: "listingPrice",
            type: "u64",
          },
          {
            name: "ltvTerms",
            type: {
              option: {
                defined: "LtvTerms",
              },
            },
          },
        ],
      },
    },
    {
      name: "borrowAuthority",
      type: {
        kind: "struct",
        fields: [],
      },
    },
  ],
  types: [
    {
      name: "LoanTerms",
      type: {
        kind: "struct",
        fields: [
          {
            name: "apyBps",
            type: "u64",
          },
          {
            name: "duration",
            type: "u64",
          },
          {
            name: "principal",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "LtvTerms",
      type: {
        kind: "struct",
        fields: [
          {
            name: "ltvBps",
            type: "u64",
          },
          {
            name: "maxOffer",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "MerkleData",
      type: {
        kind: "struct",
        fields: [
          {
            name: "index",
            type: "u64",
          },
          {
            name: "proof",
            type: {
              vec: {
                array: ["u8", 32],
              },
            },
          },
        ],
      },
    },
    {
      name: "Cpi",
      type: {
        kind: "struct",
        fields: [
          {
            name: "data",
            type: "bytes",
          },
          {
            name: "numAccounts",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "LoanStatus",
      type: {
        kind: "enum",
        variants: [
          {
            name: "WaitingForBorrower",
          },
          {
            name: "WaitingForLender",
          },
          {
            name: "Active",
          },
          {
            name: "Repaid",
          },
          {
            name: "Defaulted",
          },
          {
            name: "OnSale",
          },
        ],
      },
    },
    {
      name: "OfferType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Global",
          },
          {
            name: "Mortgage",
          },
          {
            name: "Borrow",
          },
        ],
      },
    },
  ],
  events: [
    {
      name: "LoanUpdate",
      fields: [
        {
          name: "loanAccount",
          type: "publicKey",
          index: false,
        },
        {
          name: "lender",
          type: "publicKey",
          index: false,
        },
        {
          name: "borrower",
          type: "publicKey",
          index: false,
        },
        {
          name: "mint",
          type: "publicKey",
          index: false,
        },
        {
          name: "collectionConfig",
          type: "publicKey",
          index: false,
        },
        {
          name: "status",
          type: {
            defined: "LoanStatus",
          },
          index: false,
        },
        {
          name: "loanTerms",
          type: {
            defined: "LoanTerms",
          },
          index: false,
        },
        {
          name: "creationTime",
          type: "i64",
          index: false,
        },
        {
          name: "startTime",
          type: "i64",
          index: false,
        },
        {
          name: "endTime",
          type: "i64",
          index: false,
        },
        {
          name: "fox",
          type: "bool",
          index: false,
        },
        {
          name: "tokenAccount",
          type: {
            option: "publicKey",
          },
          index: false,
        },
        {
          name: "rulesAcc",
          type: {
            option: "publicKey",
          },
          index: false,
        },
        {
          name: "mortgage",
          type: "bool",
          index: false,
        },
        {
          name: "private",
          type: "bool",
          index: false,
        },
        {
          name: "offerType",
          type: {
            defined: "OfferType",
          },
          index: false,
        },
        {
          name: "listingPrice",
          type: "u64",
          index: false,
        },
        {
          name: "ltvTerms",
          type: {
            option: {
              defined: "LtvTerms",
            },
          },
          index: false,
        },
      ],
    },
    {
      name: "LoanCancelled",
      fields: [
        {
          name: "loanAccount",
          type: "publicKey",
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidTerms",
    },
    {
      code: 6001,
      name: "InvalidMint",
    },
    {
      code: 6002,
      name: "LoanActive",
    },
    {
      code: 6003,
      name: "LoanInactive",
    },
    {
      code: 6004,
      name: "LoanNotAvailable",
    },
    {
      code: 6005,
      name: "LoanNotOpen",
    },
    {
      code: 6006,
      name: "InvalidCollectionNFT",
    },
    {
      code: 6007,
      name: "InvalidMerkleNFT",
    },
    {
      code: 6008,
      name: "CalculationError",
    },
    {
      code: 6009,
      name: "MinimumOfferPrice",
    },
    {
      code: 6010,
      name: "InvalidBorrower",
    },
    {
      code: 6011,
      name: "InvalidMarketplace",
    },
    {
      code: 6012,
      name: "InvalidOfferType",
    },
    {
      code: 6013,
      name: "InvalidCpi",
    },
    {
      code: 6014,
      name: "InsufficientBalance",
    },
  ],
}
