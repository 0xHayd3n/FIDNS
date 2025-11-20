import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy FIDRegistry
  console.log("\nDeploying FIDRegistry...");
  const FIDRegistry = await ethers.getContractFactory("FIDRegistry");
  const fidRegistry = await FIDRegistry.deploy(deployer.address);
  await fidRegistry.waitForDeployment();
  const fidRegistryAddress = await fidRegistry.getAddress();
  console.log("FIDRegistry deployed to:", fidRegistryAddress);

  // Deploy DNSRegistry
  console.log("\nDeploying DNSRegistry...");
  const DNSRegistry = await ethers.getContractFactory("DNSRegistry");
  const dnsRegistry = await DNSRegistry.deploy(fidRegistryAddress);
  await dnsRegistry.waitForDeployment();
  const dnsRegistryAddress = await dnsRegistry.getAddress();
  console.log("DNSRegistry deployed to:", dnsRegistryAddress);

  // Deploy FIDResolver
  console.log("\nDeploying FIDResolver...");
  const FIDResolver = await ethers.getContractFactory("FIDResolver");
  const fidResolver = await FIDResolver.deploy(fidRegistryAddress, dnsRegistryAddress);
  await fidResolver.waitForDeployment();
  const fidResolverAddress = await fidResolver.getAddress();
  console.log("FIDResolver deployed to:", fidResolverAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("FIDRegistry:", fidRegistryAddress);
  console.log("DNSRegistry:", dnsRegistryAddress);
  console.log("FIDResolver:", fidResolverAddress);
  console.log("\nAdd these to your .env.local file:");
  console.log(`NEXT_PUBLIC_FID_REGISTRY_ADDRESS=${fidRegistryAddress}`);
  console.log(`NEXT_PUBLIC_DNS_REGISTRY_ADDRESS=${dnsRegistryAddress}`);
  console.log(`NEXT_PUBLIC_FID_RESOLVER_ADDRESS=${fidResolverAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

