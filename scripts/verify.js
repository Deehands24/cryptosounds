const { run } = require("hardhat");

async function main() {
  console.log("Verifying Crypto Sounds contracts on Etherscan...");

  // Read deployment info
  const fs = require('fs');
  let deploymentInfo;
  
  try {
    deploymentInfo = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  } catch (error) {
    console.error("No deployment.json found. Please run deployment first.");
    process.exit(1);
  }

  const { contracts } = deploymentInfo;
  
  // Verify CryptoSoundsNFT contract
  if (contracts.CryptoSoundsNFT) {
    console.log("\nVerifying CryptoSoundsNFT contract...");
    try {
      await run("verify:verify", {
        address: contracts.CryptoSoundsNFT.address,
        constructorArguments: contracts.CryptoSoundsNFT.constructorArgs,
      });
      console.log("✅ CryptoSoundsNFT verified successfully");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ CryptoSoundsNFT already verified");
      } else {
        console.error("❌ Failed to verify CryptoSoundsNFT:", error.message);
      }
    }
  }

  // Verify AudioMetadata contract
  if (contracts.AudioMetadata) {
    console.log("\nVerifying AudioMetadata contract...");
    try {
      await run("verify:verify", {
        address: contracts.AudioMetadata.address,
        constructorArguments: contracts.AudioMetadata.constructorArgs,
      });
      console.log("✅ AudioMetadata verified successfully");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ AudioMetadata already verified");
      } else {
        console.error("❌ Failed to verify AudioMetadata:", error.message);
      }
    }
  }

  console.log("\nVerification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });