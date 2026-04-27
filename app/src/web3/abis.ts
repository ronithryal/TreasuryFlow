export const PolicyEngineABI = [
  {
    "type": "function",
    "name": "createPolicy",
    "inputs": [
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "policyType",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "source",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "destination",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "conditions",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "nextPolicyId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "policies",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "policyType",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "source",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "destination",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "conditions",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "createdAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setPolicyActive",
    "inputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updatePolicy",
    "inputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "policyType",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "source",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "destination",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "conditions",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "validateIntent",
    "inputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "source",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "destination",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "valid",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PolicyCreated",
    "inputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "name",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "policyType",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "source",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "destination",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "conditions",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PolicyStatusChanged",
    "inputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "version",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PolicyUpdated",
    "inputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "name",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "policyType",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "source",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "destination",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "conditions",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
];
export const IntentRegistryABI = [
  {
    "type": "function",
    "name": "approvals",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approveIntent",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "approver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createIntent",
    "inputs": [
      {
        "name": "policyId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "destination",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeIntent",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "txHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "intents",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "policyId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "destination",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "createdBy",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum IntentRegistry.IntentStatus"
      },
      {
        "name": "txHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "createdAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextIntentId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rejectIntent",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "reason",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "IntentApproved",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "approver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IntentCreated",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "policyId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "destination",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "createdBy",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IntentExecuted",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "txHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "IntentRejected",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "rejectedBy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LedgerEntryPosted",
    "inputs": [
      {
        "name": "intentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "txHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "blockNumber",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
];
export const LedgerContractABI = [
  {
    "type": "function",
    "name": "recordEntry",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "asset",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "txHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "blockNumber",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "LedgerEntryRecorded",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "asset",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "txHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "blockNumber",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
];
