import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QstnSurvey } from "../target/types/qstn_survey";
import { assert, expect } from "chai";

const SURVEY1_ID = 1;
const SURVEY2_ID = 2;

describe("Basic cases", () => {
  /// Helper method to get solAmount SOL on the pubkey account
  async function airdrop(pubkey, solAmount) {
    const signature = await provider.connection.requestAirdrop(pubkey, solAmount * anchor.web3.LAMPORTS_PER_SOL);
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    const commitment = "processed";
    await provider.connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      commitment
    );
  }

  // Set the Solana connection to the locally provided (Anchor starts the validator)
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  // This references the program (contract)
  const program = anchor.workspace.QstnSurvey as Program<QstnSurvey>;

  // Owner of the survey
  let owner = anchor.web3.Keypair.generate();

  // PDA derivation for the survey account
  let [surveyAccount,] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("survey"),
      owner.publicKey.toBuffer(),
      new anchor.BN(SURVEY1_ID).toBuffer("le", 8)
    ], program.programId);

  // PDA derivation for the funding account
  let [fundingAccount,] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      owner.publicKey.toBuffer()
    ], program.programId);

  // We generate a backend controller account on the fly
  const controller = anchor.web3.Keypair.generate();

  it("Should create the survey", async () => {
    await airdrop(owner.publicKey, 100);
    // Not needed because PDA is fee payer
    // await airdrop(controller.publicKey, 100);

    await program.methods
      .initSurvey(new anchor.BN(SURVEY1_ID), controller.publicKey)
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        caller: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const acc = await program.account.survey.fetch(surveyAccount);
    assert.isTrue(acc.controller.equals(controller.publicKey));
    assert.isTrue(acc.owner.equals(owner.publicKey));
  });

  it("Should fund the survey", async () => {
    const amount = 5 * anchor.web3.LAMPORTS_PER_SOL;
    let balance = await provider.connection.getBalance(fundingAccount);
    assert.equal(balance, 0);

    const tx = await program.methods
      .fundSurvey(new anchor.BN(amount))
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        caller: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    balance = await provider.connection.getBalance(fundingAccount);
    assert.equal(balance, amount);
  })

  it("Should payout an address", async () => {
    const surveyUser = anchor.web3.Keypair.generate();

    let balance = await provider.connection.getBalance(surveyUser.publicKey);
    assert.equal(balance, 0);

    const tx = await program.methods
      .payout(new anchor.BN(123_000_000))
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        owner: owner.publicKey,
        toAccount: surveyUser.publicKey,
        caller: controller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([controller])
      .rpc();

    balance = await provider.connection.getBalance(surveyUser.publicKey);
    assert.equal(balance, 123_000_000);
  })

  it("Should not change controller", async () => {
    const newWallet = anchor.web3.Keypair.generate();

    // We generate another survey creator and derive his PDAs
    const owner2 = anchor.web3.Keypair.generate();
    await airdrop(owner2.publicKey, 100);
    let [surveyAccount2,] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("survey"), owner2.publicKey.toBuffer(), new anchor.BN(200).toBuffer('le', 8)], program.programId);
    let [fundingAccount2,] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("vault"), owner2.publicKey.toBuffer()], program.programId);

    try {
      await program.methods
        .initSurvey(new anchor.BN(200), controller.publicKey)
        .accounts({
          surveyAccount: surveyAccount2,
          fundingAccount: fundingAccount2,
          caller: owner2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner2])
        .rpc();

      await program.methods
        .changeController(newWallet.publicKey)
        .accounts({
          surveyAccount: surveyAccount2,
          owner: owner.publicKey,
        })
        .signers([owner2])
        .rpc();

      assert.fail("Should not get here")
    } catch (err) {
      assert.isTrue(err.toString().includes("unknown signer"))
    }
  })

  it("Should change controller", async () => {
    const newController = anchor.web3.Keypair.generate();

    await program.methods
      .changeController(newController.publicKey)
      .accounts({
        surveyAccount: surveyAccount,
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();

    const acc = await program.account.survey.fetch(surveyAccount);
    assert.isTrue(acc.controller.equals(newController.publicKey));

    // Test payout with old controller
    const surveyUser = anchor.web3.Keypair.generate();

    try {
      const tx = await program.methods
        .payout(new anchor.BN(123_000_000))
        .accounts({
          surveyAccount: surveyAccount,
          fundingAccount: fundingAccount,
          owner: owner.publicKey,
          toAccount: surveyUser.publicKey,
          caller: controller.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([controller])
        .rpc();
    } catch (err) {
      expect(err).to.be.instanceOf(anchor.AnchorError)
      expect((err as anchor.AnchorError).error.errorCode.number).to.equal(6000)
      expect((err as anchor.AnchorError).error.errorMessage).to.contains("Caller is not survey controller")
    }

    // Test payout new
    const tx = await program.methods
      .payout(new anchor.BN(123_000_000))
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        owner: owner.publicKey,
        toAccount: surveyUser.publicKey,
        caller: newController.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newController])
      .rpc();

    let balance = await provider.connection.getBalance(surveyUser.publicKey);
    assert.equal(balance, 123_000_000);
  })

  it("Should create a second survey", async () => {
    await airdrop(owner.publicKey, 100);

    // PDA derivation needs second ID
    let [surveyAccount2,] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("survey"), owner.publicKey.toBuffer(), new anchor.BN(SURVEY2_ID).toBuffer("le", 8)], program.programId);

    await program.methods
      .initSurvey(new anchor.BN(SURVEY2_ID), controller.publicKey)
      .accounts({
        surveyAccount: surveyAccount2,
        fundingAccount: fundingAccount,
        caller: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const acc = await program.account.survey.fetch(surveyAccount2);
    assert.isTrue(acc.controller.equals(controller.publicKey));
    assert.isTrue(acc.owner.equals(owner.publicKey));
  });
});
