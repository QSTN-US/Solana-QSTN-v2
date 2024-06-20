# QSTN + Solana Network - work in progress

<p align="center">
  <a href="https://qstnus.com/"><img src="https://qstnus.com/icon-256x256.png" alt="QSTN Marketplace"></a>
</p>

**_🚀 QSTN is a platform that connects businesses and individuals through market research surveys. We partner with companies that are looking for feedback from consumers like you, and we provide the opportunity for you to earn rewards while sharing your opinions._**

### About Solana Network

Solana empowers builders to unlock human and economic potential. It combines a powerful, decentralized blockchain network with a global ecosystem of innovators to create opportunities as borderless as ideas. It offers the tools to make a difference in the real world through new digital asset products and services that enhance access to the global financial system.

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
Before you begin, ensure you have the following:

Rust: The smart contracts are written in Rust. You need to have Rust installed on your system. You can download it from here.
Solana CLI: Install the Solana command line tools. Follow the instructions here.
Node.js and NPM: Required for running the frontend example. Install it from here.

**Installation**
Clone the repository and navigate to the contracts directory:

bash
Copy code
git clone https://github.com/QSTN-US/Solana-QSTN-v2.git
cd Solana-QSTN-v2/CONTRACTS/qstn-survey-native

**Contract Overview**
This repository contains smart contracts designed for creating and funding surveys. Key components include:

survey_contract.rs: Main contract for creating and managing surveys.
funding_contract.rs: Handles the funding mechanism for surveys.
survey_contract.rs
The survey_contract.rs contract allows users to create surveys, respond to them, and manage survey data. Key functions include:

create_survey(ctx: Context<CreateSurvey>, title: String, description: String)
respond_to_survey(ctx: Context<RespondToSurvey>, survey_id: u64, response: String)
funding_contract.rs
The funding_contract.rs contract allows businesses to fund surveys and manage their funding pools. Key functions include:

fund_survey(ctx: Context<FundSurvey>, survey_id: u64, amount: u64)

**Deploying the Contracts**
Follow these steps to deploy the contracts on the Solana blockchain:

Compile the Contracts:

bash
Copy code
cargo build-bpf
Deploy the Contracts:

Use the Solana CLI to deploy the contracts. Replace PATH_TO_PROGRAM with the path to your compiled program.

bash
Copy code
solana program deploy target/deploy/survey_contract.so
solana program deploy target/deploy/funding_contract.so
Initialize the Contracts:

After deployment, initialize the contracts using the provided scripts or manually via the Solana CLI.

bash
Copy code
solana program invoke ...

**Using the Contracts**
Creating a Survey
Call the create_survey function on the survey_contract.rs contract to create a new survey.

rust
Copy code
pub fn create_survey(ctx: Context<CreateSurvey>, title: String, description: String) -> ProgramResult {
    // Implementation
}
Funding a Survey
Use the fund_survey function on the funding_contract.rs contract to fund an existing survey.

rust
Copy code
pub fn fund_survey(ctx: Context<FundSurvey>, survey_id: u64, amount: u64) -> ProgramResult {
    // Implementation
}
Responding to a Survey
Participants can respond to surveys using the respond_to_survey function on the survey_contract.rs contract.

rust
Copy code
pub fn respond_to_survey(ctx: Context<RespondToSurvey>, survey_id: u64, response: String) -> ProgramResult {
    // Implementation
}

**Examples**
Creating and Funding a Survey
Here’s an example of creating and funding a survey using the Rust SDK:

Create Survey:

rust
Copy code
let survey_id = survey_contract::create_survey(ctx, "Survey Title".to_string(), "Survey Description".to_string())?;
Fund Survey:

rust
Copy code
funding_contract::fund_survey(ctx, survey_id, 100)?;
Respond to Survey:

rust
Copy code
survey_contract::respond_to_survey(ctx, survey_id, "Survey Response".to_string())?;

**Contributing**
We welcome contributions! Please read our contributing guide to get started.

**Support**
If you encounter any issues or have questions, please open an issue on GitHub or contact our support team at support@qstn.us.

**License**
This project is licensed under the MIT License. See the LICENSE file for details.
