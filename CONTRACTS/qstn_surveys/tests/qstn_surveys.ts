import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, transfer } from '@solana/spl-token';
import { assert } from 'chai';

describe('qstn_surveys', async() => {
  const provider = anchor.AnchorProvider.env();
  const connection = provider.connection
  anchor.setProvider(provider);
  const program = anchor.workspace.QstnSurveys;

  let pdaSurvey = null;
  let bumpSurvey = null;
  let pdaReward = null;
  let bumpReward = null;

  let mint = null;

  // User
  // Wallet is provider.wallet.publicKey. Keypair is provider.wallet.payer.
  let userTokenAccount = null;
  let userTokenBalance = null;

  // Admin
  const admin = Keypair.generate();
  let adminTokenAccount = null;
  let adminTokenBalance = null;

  // Reward
  let transferAmount = null;

  it('Gets a PDA for Survey.', async () => {
    // It need underscore vars. Shouldn't directly into vars(e.g. let pda; [pda, bump] = xxx;).
    const [_pdaSurvey, _bumpSurvey] = await PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("survey"),
        provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );

    // Important
    pdaSurvey = _pdaSurvey;
    bumpSurvey = _bumpSurvey;

    assert.ok(pdaSurvey);
    assert.ok(bumpSurvey);

    console.log('\n');
    console.log('pdaSurvey   =>', pdaSurvey.toString());
    console.log('bumpSurvey  =>', bumpSurvey);
  });

  it('Gets a PDA for Reward.', async () => {
    // It need underscore vars. Shouldn't directly into vars(e.g. let pda; [pda, bump] = xxx;).
    const [_pdaReward, _bumpReward] = await PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("reward"),
        provider.wallet.publicKey.toBuffer(),
        admin.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Important
    pdaReward = _pdaReward;
    bumpReward = _bumpReward;

    assert.ok(pdaReward);
    assert.ok(bumpReward);

    console.log('\n');
    console.log('pdaReward   =>', pdaReward.toString());
    console.log('bumpSurvey  =>', bumpSurvey);
  });

  it('Creates a survey account.', async () => {
    const create_tx = await program.rpc.createSurvey(
      {
        accounts: {
          user: provider.wallet.publicKey,
          survey: pdaSurvey,
          systemProgram: SystemProgram.programId
        }
      }
    );

    let fetchSurvey = await program.account.survey.fetch(pdaSurvey);
    assert.ok(fetchSurvey);

    console.log('\n');
    console.log('fetchSurvey =>', fetchSurvey);
    console.log('create_tx    =>', create_tx);
    console.log('---------------------------------------------------');
  });

  it('Creates a reward account.', async () => {
    const createReward_tx = await program.rpc.createReward(
      {
        accounts: {
          user: provider.wallet.publicKey,
          admin: admin.publicKey,
          reward: pdaReward,
          systemProgram: SystemProgram.programId
        }
      }
    );

    let fetchReward = await program.account.reward.fetch(pdaReward);
    assert.ok(fetchReward);

    console.log('\n');
    console.log('fetchReward     =>', fetchReward);
    console.log('createReward_tx =>', createReward_tx);
    console.log('---------------------------------------------------');
  });

  it("Increments a survey participation.", async () => {
    const increment_tx = await program.rpc.incrementSurvey({
      accounts: {
        user: provider.wallet.publicKey,
        survey: pdaSurvey,
      },
    });

    let fetchSurvey = await program.account.survey.fetch(pdaSurvey);
    assert.ok(fetchSurvey.count === 1);

    console.log('\n');
    console.log('fetchSurvey =>', fetchSurvey);
    console.log('increment_tx =>', increment_tx);
    console.log('---------------------------------------------------');
  });

  it("Airdrop for admin.", async () => {
    let airdropSignature = await connection.requestAirdrop(
        admin.publicKey,
        LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(airdropSignature);

    const adminBalance = await connection.getBalance(admin.publicKey);
    assert.ok(adminBalance === LAMPORTS_PER_SOL);
  });

  it("Creates a token.", async () => {
    mint = await createMint(
      connection,       // connection,
      admin,            // payer,
      admin.publicKey,  // authority,
      null,             // freeze_authority???
      9                 // decimals
    );
    assert.ok(mint);

    console.log('\n');
    console.log('mint =>', mint.toString());
    console.log('---------------------------------------------------');
  });

  it("Creates an userTokenAccount.", async () => {
    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,               // connection: Connection,
      // @ts-ignore
      provider.wallet.payer,    // payer: Signer,
      mint,                     // mint: PublicKey,
      provider.wallet.publicKey // owner: PublicKey,
    );

    assert.ok(userTokenAccount.address);
    assert.ok(Number(userTokenAccount.amount) === 0);

    console.log('\n');
    console.log('userTokenAccount =>', userTokenAccount.address.toString());
    console.log('---------------------------------------------------');
  });

  it("Creates an adminTokenAccount.", async () => {
    adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,     // connection: Connection,
      admin,          // payer: Signer,
      mint,           // mint: PublicKey,
      admin.publicKey // owner: PublicKey,
    );

    userTokenBalance = await connection.getTokenAccountBalance(userTokenAccount.address);
    adminTokenBalance = await connection.getTokenAccountBalance(adminTokenAccount.address);
    assert.ok(Number(userTokenBalance.value.amount) === 0);
    assert.ok(Number(adminTokenBalance.value.amount) === 0);

    console.log('\n');
    console.log('adminTokenAccount  =>', adminTokenAccount.address.toString());
    console.log('userTokenBalance   =>', userTokenBalance.value.amount);
    console.log('adminTokenBalance  =>', adminTokenBalance.value.amount);
    console.log('---------------------------------------------------');
  });

  it("Mints tokens.", async () => {
    const mint_tx = await mintTo(
      connection,                 // Connection
      admin,                      // Payer
      mint,                       // Mint Address
      adminTokenAccount.address,  // Destination Address
      admin.publicKey,            // Mint Authority
      LAMPORTS_PER_SOL,           // Mint Amount
      []                          // Signers???
    );

    userTokenBalance = await connection.getTokenAccountBalance(userTokenAccount.address);
    adminTokenBalance = await connection.getTokenAccountBalance(adminTokenAccount.address);
    assert.ok(Number(userTokenBalance.value.amount) === 0);
    assert.ok(Number(adminTokenBalance.value.amount) === LAMPORTS_PER_SOL);

    console.log('\n');
    console.log('userTokenBalance   =>', userTokenBalance.value.amount);
    console.log('adminTokenBalance  =>', adminTokenBalance.value.amount);
    console.log('mint_tx            =>', mint_tx)
    console.log('---------------------------------------------------');
  });

  // Read count in survey account then transfers survey amount same tokens.
  it("Transfers 1 token.", async () => {
    let fetchSurvey = await program.account.survey.fetch(pdaSurvey);
    let fetchReward = await program.account.reward.fetch(pdaReward);
    let transferAmount = fetchSurvey.count - fetchReward.count;

    const transfer_tx = await transfer(
      connection,                 // Connection
      admin,                      // Payer
      adminTokenAccount.address,  // From Address
      userTokenAccount.address,   // To Address
      admin.publicKey,            // Authority
      transferAmount,             // Transfer Amount
      []                          // Signers???
    );

    userTokenBalance = await connection.getTokenAccountBalance(userTokenAccount.address);
    adminTokenBalance = await connection.getTokenAccountBalance(adminTokenAccount.address);
    assert.ok(Number(userTokenBalance.value.amount) === 1);

    console.log('\n');
    console.log('userTokenBalance   =>', userTokenBalance.value.amount);
    console.log('adminTokenBalance  =>', adminTokenBalance.value.amount);
    console.log('fetchSurvey       =>', fetchSurvey);
    console.log('fetchReward       =>', fetchReward);
    console.log('transfer_tx        =>', transfer_tx)
    console.log('---------------------------------------------------');
  });

  // Write transfer evidence to reward.
  it("Update reward.", async () => {
    const updateReward_tx = await program.rpc.updateReward({
      accounts: {
        user: provider.wallet.publicKey,
        admin: admin.publicKey,
        reward: pdaReward,
        survey: pdaSurvey,
      },
    });

    let fetchSurvey = await program.account.survey.fetch(pdaSurvey);
    let fetchReward = await program.account.reward.fetch(pdaReward);
    assert.ok(fetchReward.count === 1);

    console.log('\n');
    console.log('fetchSurvey     =>', fetchSurvey);
    console.log('fetchReward     =>', fetchReward);
    console.log('updateReward_tx =>', updateReward_tx);
    console.log('---------------------------------------------------');
  });
});

/*
% anchor test

qstn_surveys


pdaSurvey   => Gr5Byc7RVyPuBYDvQH4fktcvYgVnBg1rU3VryjC7Mcfy
bumpSurvey  => 255
  ✓ Gets a PDA for Survey.


pdaReward   => 5b1FyYLd6rDkP3usQND2Zugzn1DnMsCRRsaDjCgMjJoT
bumpSurvey  => 255
  ✓ Gets a PDA for Reward.


fetchSurvey => { bump: 255, count: 0 }
create_tx    => f1UnWxim4SCr2sZbH9kceeE5bfvPQejrhnrqy93sSr8trfYt5VRqgdAtvbB9HeQzhW4XpY1AwHghReJUW1QqeUB
---------------------------------------------------
  ✓ Creates a survey account. (340ms)


fetchReward     => { bump: 255, count: 0 }
createReward_tx => YMNwCf2Jv4pZ3LJ7cdeEYR3fxhfT7MpgRjBAG6fRurbZHmDB7phHvayLuQd3nneRZeu3jo1Zfsz2CZhzBN4HQNx
---------------------------------------------------
  ✓ Creates a reward account. (474ms)


fetchSurvey => { bump: 255, count: 1 }
increment_tx => 2PFA9LEQRiKQVxnzFWsd2iEBgkEjntceGA9zwgCWwZhRkvH5cvxU2qaa729KNMUkCB1mhHM8mFAmAX59ek4Lrs1A
---------------------------------------------------
  ✓ Increments a count. (482ms)
  ✓ Airdrop for admin. (471ms)


mint => HNLUCbWEtQdtzEz4UrtXGvapnRxzqxh49dJbHQtQWM1i
---------------------------------------------------
  ✓ Creates a token. (470ms)


userTokenAccount => GkEQznoUT6BZ95SvFb2AD7T9S33AcxGUexTTjUnuGjxy
---------------------------------------------------
  ✓ Creates an userTokenAccount. (477ms)


adminTokenAccount  => 2v62Fkve1vJQZdZ25QjeB8C99SGWcXx7daqGMTVRsSQk
userTokenBalance   => 0
adminTokenBalance  => 0
---------------------------------------------------
  ✓ Creates an adminTokenAccount. (462ms)


userTokenBalance   => 0
adminTokenBalance  => 1000000000
mint_tx            => 5rqzsPNyi5qmtoeZqihWDhgMULJ1D3NSCh3DWqewFBZa5GFWXSk2GaxG7rHgPrkz7uvw5VyjzQxeGEkCzhH9AgKA
---------------------------------------------------
  ✓ Mints tokens. (448ms)


userTokenBalance   => 1
adminTokenBalance  => 999999999
fetchSurvey       => { bump: 255, count: 1 }
fetchReward       => { bump: 255, count: 0 }
transfer_tx        => 31nadWJWq4QwW23p78vSSi3C9oahdhSsv21cj5d6SYFakjgTJm1nTv2TPdk3PLurRw822VrfMHSK9ge5sqeLxxLJ
---------------------------------------------------
  ✓ Transfers 1 token. (430ms)


fetchSurvey     => { bump: 255, count: 1 }
fetchReward     => { bump: 255, count: 1 }
updateReward_tx => 65c9R9bMin15xj9VzGEPv2Pc6vx5a9dZpfZ3Hcdct7gFgDFgSf1PWuSM1MT13byRnN58qjPcQDTNXvcLD2Bwyb87
---------------------------------------------------
  ✓ Update reward. (479ms)


12 passing (5s)

✨  Done in 10.49s.
*/
