import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QstnSurvey } from "../target/types/qstn_survey";
import { assert, expect } from "chai";

const SURVEY1_ID = 1;
const SURVEY2_ID = 2;

describe("Basic cases", () => {
  /// Helper method to get solAmount SOL on the pubkey account
  async function airdrop(pubkey, solAmount) {
    const signature = await provider.connection.requestAirdrop(
      pubkey,
      solAmount * anchor.web3.LAMPORTS_PER_SOL
    );
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
  let [surveyAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("survey"),
      owner.publicKey.toBuffer(),
      new anchor.BN(SURVEY1_ID).toBuffer("le", 8),
    ],
    program.programId
  );

  // PDA derivation for the funding account
  let [fundingAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      surveyAccount.toBuffer(),
      owner.publicKey.toBuffer(),
    ],
    program.programId
  );

  // We generate a backend controller account on the fly
  const controller = anchor.web3.Keypair.generate();

  it("Should create the survey", async () => {
    await airdrop(owner.publicKey, 10000);
    const amount = 5 * anchor.web3.LAMPORTS_PER_SOL;
    // Not needed because PDA is fee payer
    // await airdrop(controller.publicKey, 100);

    await program.methods
      .initSurvey(
        new anchor.BN(SURVEY1_ID),
        "SurveyXOXO",
        controller.publicKey,
        new anchor.BN(100),
        new anchor.BN(amount)
      )
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

  it("Should register participant", async () => {
    await airdrop(controller.publicKey, 5);

    let participantAccount = anchor.web3.Keypair.generate().publicKey;

    let [participation] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("part"),
        surveyAccount.toBuffer(),
        participantAccount.toBuffer(),
      ],
      program.programId
    );
  });

  it("Should fund the survey", async () => {
    const amount = 5 * anchor.web3.LAMPORTS_PER_SOL;
    let balance = await provider.connection.getBalance(fundingAccount);
    assert.equal(balance, 0);

    const tx = await program.methods
      .fundSurvey(new anchor.BN(amount * 100), new anchor.BN(100))
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        caller: owner.publicKey,
        controller: controller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    balance = await provider.connection.getBalance(fundingAccount);
    assert.equal(balance, amount * 100);
  });

  it("Should payout an address", async () => {
    const amount = 5 * anchor.web3.LAMPORTS_PER_SOL;
    const surveyUser = anchor.web3.Keypair.generate();
    const surveyUser2 = anchor.web3.Keypair.generate();

    let balance = await provider.connection.getBalance(surveyUser.publicKey);
    assert.equal(balance, 0);

    let [participation] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("part"),
        surveyAccount.toBuffer(),
        surveyUser.publicKey.toBuffer(),
      ],
      program.programId
    );

    let [participation2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("part"),
        surveyAccount.toBuffer(),
        surveyUser2.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .payout("zkp-proof")
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        participantAddress: surveyUser.publicKey,
        participation: participation,
        owner: owner.publicKey,
        caller: controller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([controller])
      .rpc();

    balance = await provider.connection.getBalance(surveyUser.publicKey);
    assert.equal(balance, amount);

    try {
      await program.methods
        .payout("zkp-proof")
        .accounts({
          surveyAccount: surveyAccount,
          fundingAccount: fundingAccount,
          participantAddress: surveyUser.publicKey,
          participation: participation,
          owner: owner.publicKey,
          caller: controller.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([controller])
        .rpc();

      assert.fail("Should not get here");
    } catch (err) {
      assert.isTrue(true);
    }

    const tx2 = await program.methods
      .payout("zkp-proof")
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        participantAddress: surveyUser2.publicKey,
        participation: participation2,
        owner: owner.publicKey,
        caller: controller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([controller])
      .rpc();

    balance = await provider.connection.getBalance(surveyUser2.publicKey);
    assert.equal(balance, amount);
  });

  it("Should not change controller", async () => {
    const newWallet = anchor.web3.Keypair.generate();

    // We generate another survey creator and derive his PDAs
    const owner2 = anchor.web3.Keypair.generate();
    await airdrop(owner2.publicKey, 100);
    let [surveyAccount2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("survey"),
        owner2.publicKey.toBuffer(),
        new anchor.BN(200).toBuffer("le", 8),
      ],
      program.programId
    );
    let [fundingAccount2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        surveyAccount2.toBuffer(),
        owner2.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .initSurvey(
          new anchor.BN(200),
          "SurveyXOXO",
          controller.publicKey,
          new anchor.BN(1),
          new anchor.BN(1)
        )
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
          owner: owner2.publicKey,
          caller: owner2.publicKey,
        })
        .signers([owner2])
        .rpc();

      assert.fail("Should not get here");
    } catch (err) {
      assert.isTrue(err.toString().includes("not survey controller"));
    }
  });

  it("Should change controller", async () => {
    const amount = 5 * anchor.web3.LAMPORTS_PER_SOL;
    const newController = anchor.web3.Keypair.generate();
    await airdrop(newController.publicKey, 10);

    await program.methods
      .changeController(newController.publicKey)
      .accounts({
        surveyAccount: surveyAccount,
        owner: owner.publicKey,
        caller: controller.publicKey,
      })
      .signers([controller])
      .rpc();

    const acc = await program.account.survey.fetch(surveyAccount);
    assert.isTrue(acc.controller.equals(newController.publicKey));

    // Test payout with old controller
    const surveyUser = anchor.web3.Keypair.generate();

    let [participation] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("part"),
        surveyAccount.toBuffer(),
        surveyUser.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      const tx = await program.methods
        .payout("zkp-proof")
        .accounts({
          surveyAccount: surveyAccount,
          fundingAccount: fundingAccount,
          participantAddress: surveyUser.publicKey,
          participation: participation,
          owner: owner.publicKey,
          caller: controller.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([controller])
        .rpc();
    } catch (err) {
      expect(err).to.be.instanceOf(anchor.AnchorError);
      expect((err as anchor.AnchorError).error.errorCode.number).to.equal(6000);
      expect((err as anchor.AnchorError).error.errorMessage).to.contains(
        "Caller is not survey controller"
      );
    }

    // Test payout new
    const tx = await program.methods
      .payout("zkp-proof")
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        owner: owner.publicKey,
        participantAddress: surveyUser.publicKey,
        participation: participation,
        caller: newController.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newController])
      .rpc();

    let balance = await provider.connection.getBalance(surveyUser.publicKey);
    assert.equal(balance, amount);
  });

  it("Should create a second survey", async () => {
    await airdrop(owner.publicKey, 100);

    // PDA derivation needs second ID
    let [surveyAccount2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("survey"),
        owner.publicKey.toBuffer(),
        new anchor.BN(SURVEY2_ID).toBuffer("le", 8),
      ],
      program.programId
    );

    let [fundingAccount2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        surveyAccount2.toBuffer(),
        owner.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .initSurvey(
        new anchor.BN(SURVEY2_ID),
        "SurveyXOXO",
        controller.publicKey,
        new anchor.BN(1),
        new anchor.BN(1)
      )
      .accounts({
        surveyAccount: surveyAccount2,
        fundingAccount: fundingAccount2,
        caller: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const acc = await program.account.survey.fetch(surveyAccount2);
    assert.isTrue(acc.controller.equals(controller.publicKey));
    assert.isTrue(acc.owner.equals(owner.publicKey));
  });

  it("Check limits requirements", async () => {
    let owner = anchor.web3.Keypair.generate();
    await airdrop(owner.publicKey, 10000);

    let [surveyAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("survey"),
        owner.publicKey.toBuffer(),
        new anchor.BN(3).toBuffer("le", 8),
      ],
      program.programId
    );

    let [fundingAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        surveyAccount.toBuffer(),
        owner.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .initSurvey(
        new anchor.BN(3),
        "SurveyXOXO",
        controller.publicKey,
        new anchor.BN(10),
        new anchor.BN(1_000_000_000)
      )
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

    let amount = 5 * anchor.web3.LAMPORTS_PER_SOL;
    let balance = await provider.connection.getBalance(fundingAccount);
    assert.equal(balance, 0);
    try {
      await program.methods
        .fundSurvey(new anchor.BN(amount), new anchor.BN(100))
        .accounts({
          surveyAccount: surveyAccount,
          fundingAccount: fundingAccount,
          caller: owner.publicKey,
          controller: controller.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
      assert.fail("Should not get here");
    } catch (error) {
      expect((error as anchor.AnchorError).error.errorMessage).to.contains(
        "Insufficient funds"
      );
    }

    amount = amount * 2;
    await program.methods
      .fundSurvey(new anchor.BN(amount), new anchor.BN(100))
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        caller: owner.publicKey,
        controller: controller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    balance = await provider.connection.getBalance(fundingAccount);
    assert.equal(balance, amount);

    const actionsArray = new Array(10).fill(0);

    for (const action in actionsArray) {
      let surveyUser = anchor.web3.Keypair.generate();
      let balance = await provider.connection.getBalance(surveyUser.publicKey);
      assert.equal(balance, 0);

      let [participation] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("part"),
          surveyAccount.toBuffer(),
          surveyUser.publicKey.toBuffer(),
        ],
        program.programId
      );

      const tx = await program.methods
        .payout("zkp-proof")
        .accounts({
          surveyAccount: surveyAccount,
          fundingAccount: fundingAccount,
          participantAddress: surveyUser.publicKey,
          participation: participation,
          owner: owner.publicKey,
          caller: controller.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([controller])
        .rpc();

      balance = await provider.connection.getBalance(surveyUser.publicKey);
      assert.equal(balance, 1_000_000_000);
    }

    try {
      let surveyUser = anchor.web3.Keypair.generate();
      let balance = await provider.connection.getBalance(surveyUser.publicKey);
      assert.equal(balance, 0);

      let [participation] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("part"),
          surveyAccount.toBuffer(),
          surveyUser.publicKey.toBuffer(),
        ],
        program.programId
      );

      const tx = await program.methods
        .payout("zkp-proof")
        .accounts({
          surveyAccount: surveyAccount,
          fundingAccount: fundingAccount,
          participantAddress: surveyUser.publicKey,
          participation: participation,
          owner: owner.publicKey,
          caller: controller.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([controller])
        .rpc();
      assert.fail("Should not get here");
    } catch (error) {
      expect((error as anchor.AnchorError).error.errorMessage).to.contains(
        "Participants limit reached"
      );
    }
  });

  it("Check emergency withdraw", async () => {
    let owner = anchor.web3.Keypair.generate();
    await airdrop(owner.publicKey, 10000);

    let [surveyAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("survey"),
        owner.publicKey.toBuffer(),
        new anchor.BN(3).toBuffer("le", 8),
      ],
      program.programId
    );

    let [fundingAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        surveyAccount.toBuffer(),
        owner.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .initSurvey(
        new anchor.BN(3),
        "SurveyXOXO",
        controller.publicKey,
        new anchor.BN(10),
        new anchor.BN(1_000_000_000)
      )
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        caller: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    let amount = 10 * anchor.web3.LAMPORTS_PER_SOL;
    let balance = await provider.connection.getBalance(fundingAccount);

    await program.methods
      .fundSurvey(new anchor.BN(amount), new anchor.BN(100))
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        caller: owner.publicKey,
        controller: controller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    try {
      await program.methods
        .emergencyWithdraw()
        .accounts({
          surveyAccount: surveyAccount,
          fundingAccount: fundingAccount,
          owner: owner.publicKey,
          caller: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
      assert.fail("Should not get here");
    } catch (error) {
      expect((error as anchor.AnchorError).error.errorMessage).to.contains(
        "not survey controller"
      );
    }

    let balancePrev = await provider.connection.getBalance(owner.publicKey);
    await program.methods
      .emergencyWithdraw()
      .accounts({
        surveyAccount: surveyAccount,
        fundingAccount: fundingAccount,
        owner: owner.publicKey,
        caller: controller.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([controller])
      .rpc();
    let balanceNext = await provider.connection.getBalance(owner.publicKey);
    assert.equal(
      Number(balanceNext.toString()) - Number(balancePrev.toString()),
      amount
    );
  });
});
