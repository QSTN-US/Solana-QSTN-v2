import * as anchor from "@project-serum/anchor"
import * as spl from "@solana/spl-token"
import { Program } from "@project-serum/anchor"
import { AnchorNft } from "../target/types/anchor_nft"
import { Metaplex } from "@metaplex-foundation/js"
import {
  Metadata,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata"
import { assert } from "chai"

describe("anchor-nft", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  // Read the generated IDL.
  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/anchor_nft.json", "utf8")
  );

  //Address of the deployed program
  const programId = new anchor.web3.PublicKey("4KrkcS2PRC1gCPXpEyRyTFMkqiKrqwmYx1HuoJ23QKWt");

  //Generate the program client from IDL
  const program = new anchor.Program(idl, programId);

  //const program = anchor.workspace.AnchorNft as Program<AnchorNft>

  const wallet = program.provider.wallet
  const connection = program.provider.connection
  const metaplex = Metaplex.make(connection)

  const testMetadata = {
    uri: "https://arweave.net/h19GMcMz7RLDY7kAHGWeWolHTmO83mLLMNPzEkF32BQ",
    name: "QSTN Genesis",
    symbol: "QSTN",
  }

  it("Is initialized!", async () => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("nft")],
      program.programId
    )

    const nftMint = anchor.web3.Keypair.generate()

    const metadata = await metaplex
      .nfts()
      .pdas()
      .metadata({ mint: nftMint.publicKey })

    const masterEdition = await metaplex
      .nfts()
      .pdas()
      .masterEdition({ mint: nftMint.publicKey })

    const tokenAddress = await spl.getAssociatedTokenAddress(
      nftMint.publicKey,
      wallet.publicKey
    )

    // Add your test here.
    const txSig = await program.methods
      .mintNft(testMetadata.uri, testMetadata.name, testMetadata.symbol)
      .accounts({
        payer: wallet.publicKey,
        pda: pda,
        nftMint: nftMint.publicKey,
        metadata: metadata,
        masterEdition: masterEdition,
        tokenAccount: tokenAddress,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([nftMint])
      .rpc()
    console.log("Your transaction signature", txSig)

    const accountInfo = await connection.getAccountInfo(metadata)
    const metadataData = Metadata.deserialize(accountInfo.data, 0)

    assert.ok(
      metadataData[0].data.uri.startsWith(testMetadata.uri),
      "URI in metadata does not start with expected URI"
    )
    assert.ok(
      metadataData[0].data.name.startsWith(testMetadata.name),
      "Name in metadata does not start with expected name"
    )
    assert.ok(
      metadataData[0].data.symbol.startsWith(testMetadata.symbol),
      "Symbol in metadata does not start with expected symbol"
    )

    assert.ok(
      metadataData[0].data.creators[0].address.equals(pda),
      "Creator is not PDA"
    )

    assert.ok(
      metadataData[0].data.creators[0].verified,
      "Creator is not verified"
    )

    assert.strictEqual(
      Number(
        (await connection.getTokenAccountBalance(tokenAddress)).value.amount
      ),
      1,
      "Token amount is not 1"
    )
  })
})