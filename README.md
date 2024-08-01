# QSTN + Solana Network - work in progress

<p align="center">
  <a href="https://qstnus.com/"><img src="https://qstnus.com/icon-256x256.png" alt="QSTN Marketplace"></a>
</p>

**_🚀 QSTN is a platform that connects businesses and individuals through market research surveys. We partner with companies that are looking for feedback from consumers like you, and we provide the opportunity for you to earn rewards while sharing your opinions._**

***Business Demo***
https://drive.google.com/file/d/13xazUCDOVFUpGGrDff0YnXcdu9DXWT8D/view?usp=drive_link

***User Demo*** 
https://drive.google.com/file/d/1PkL0nq9getU_tvM8L0itXx_k4m2xBoT2/view?usp=drive_link

**QSTN Survey Smart Contracts Documentation**

Welcome to the QSTN Survey Smart Contracts repository. This guide will help you understand how to deploy and use our smart contracts for business funding on the Solana blockchain.

Table of Contents
Introduction
Prerequisites
Installation
Contract Overview
Deploying the Contracts
Using the Contracts
Examples
Contributing
Support
License

**Introduction**

QSTN provides a decentralized solution for businesses to fund surveys using smart contracts on the Solana blockchain. This guide explains how to set up, deploy, and interact with the QSTN survey smart contracts.

**Prerequisites**

To run, test, or deploy this smart contract, make sure you have everything necessary to run the project on Anchor installed. You can find all the necessary instructions for setting up the Anchor environment [here](https://www.anchor-lang.com/docs/installation).

**Installation**

Clone the repository and navigate to the contracts directory:

```bash
git clone https://github.com/QSTN-US/Solana-QSTN-v2.git
cd Solana-QSTN-v2/CONTRACTS/qstn-survey-native
yarn
anchor build
anchor test
```

**Contract Overview**

This repository contains solana program (smart contract) designed for creating and funding surveys. Key components include:

lib.rs: Main program for creating and managing surveys.
qstn-survey.ts: Test cases of survey contract using and security tests.

The lib.rs program allows users to create surveys, fund them, and manage survey data. Key functions include:

```rust
init_survey(
ctx: Context<InitSurvey>,
survey_id: u64,
survey_uuid: String,
controller: Pubkey,
participants_limit: u64,
reward_amount: u64,
)
```

`init_survey` is used to initialize the PDA instance for a new survey. In the ecosystem, this function is called by a business user who creates a new survey.

```rust
fund_survey(ctx: Context<FundSurvey>, amount: u64, fee: u64)
```

`fund_survey` is used to fund the newly created survey with native currency, which will be used as a reward for users who take the survey. Additionally, a portion of the funds is allocated as compensation for the manager's expenses to automate the reward payouts to users.

```rust
payout(ctx: Context<PayoutReward>, zkp_claim: String)
```

`payout` is used to distribute rewards to a specific user. This function can only be called by the manager. It accepts a ZKP hash to confirm the payout and stores it.

```rust
emergency_withdraw(ctx: Context<EmergencyWithdraw>)
```

`emergency_withdraw` is used for the emergency withdrawal of funds from the survey to the wallet of the user who created the survey.

**Deploying the Contracts**

Follow these steps to deploy the contracts on the Solana blockchain:

% anchor build
% anchor deploy

**Examples**

Creating and Funding a Survey
Here’s an example of creating and funding a survey using the @solana/web3.js:

```typescript
const program = new Program(QstnSurveyIDL as Idl, programId, { connection });

let [surveyAccount] = await anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("survey"),
    userAccount.toBuffer(),
    new anchor.BN(suid).toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);

let [fundingAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), surveyAccount.toBuffer(), userAccount.toBuffer()],
  program.programId
);
```

```typescript
const transaction = await program.methods
  .initSurvey(
    new anchor.BN(ts),
    surveyUuid,
    controller,
    new anchor.BN(usersAmount),
    new anchor.BN(rewardAmount)
  )
  .accounts({
    surveyAccount: surveyAccount,
    fundingAccount: fundingAccount,
    caller: userAccount,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .transaction();

const transactionSignature = await sendTransaction(transaction, connection);
```

```typescript
const transaction = await program.methods
  .fundSurvey(
    new anchor.BN(rewardAmount * usersAmount),
    new anchor.BN(feeAmount)
  )
  .accounts({
    surveyAccount: surveyAccount,
    fundingAccount: fundingAccount,
    caller: userAccount,
    controller: controller,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .transaction();

const transactionSignature = await sendTransaction(transaction, connection);
```

**Contributing**

We welcome contributions! Please read our contributing guide to get started.

**Support**

If you encounter any issues or have questions, please open an issue on GitHub or contact our support team at support@qstn.us.

**License**

This project is licensed under the MIT License. See the LICENSE file for details.

```

```
