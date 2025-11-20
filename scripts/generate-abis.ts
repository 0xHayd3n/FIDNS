import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

/**
 * This script should be run after compiling contracts with Hardhat
 * It copies the ABI files from artifacts to the abis directory
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const artifactsDir = path.join(__dirname, '../artifacts/contracts')
const abisDir = path.join(__dirname, '../abis')

const contracts = ['FIDRegistry', 'DNSRegistry', 'FIDResolver']

contracts.forEach((contractName) => {
  const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`)
  const abiPath = path.join(abisDir, `${contractName}.json`)

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2))
    console.log(`Generated ${contractName}.json`)
  } else {
    console.warn(`Artifact not found for ${contractName}`)
  }
})

