import { ethers } from "ethers";
import fs from "fs";
// 1. Datos de conexión que usamos en el proyecto (Sepolia)
const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"; 
const CONTRACT_ADDRESS = "0x244759b689415f5f9227Dc893C1c29F122CD0b11";
// Tu dirección real de MetaMask
const MI_BILLETERA = "0x3b9DE69C652f54582155372d45bB176e810eEEA1"; 
// 2. Cargamos el ABI automáticamente desde tu archivo existente
const abiPath = "./src/artifacts/VotingDAO.json";
const ABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));
async function main() {
  // 3. Crear el proveedor usando HTTP (JsonRpcProvider)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // 4. Conectar con el contrato inteligente
  const votingContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  console.log("Conectado al contrato de Votación en Sepolia...\n");
  // 5. Hacemos consultas al contrato
  const chairperson = await votingContract.chairperson();
  console.log("Dirección del Presidente (Chairperson):", chairperson);
  // 6. Consultamos la información de tu billetera específica
  console.log(`\nConsultando datos para la billetera: ${MI_BILLETERA}`);
  
  // Consultamos la función "voters" que recibe una dirección y devuelve los datos
  const voterInfo = await votingContract.voters(MI_BILLETERA);
  
  console.log("-----------------------------");
  console.log("Peso de voto:", voterInfo.weight.toString());
  console.log("¿Ya votó?:", voterInfo.voted ? "Sí" : "No");
  console.log("Delegado a:", voterInfo.delegate);
  console.log("-----------------------------");
}
main().catch(console.error);