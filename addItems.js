const { connectToMongoDB, Sealer, DefaultNode } = require("./setupMongoDB");
const { default: mongoose } = require("mongoose");
const axios = require("axios");
const Web3 = require("web3");


const contractAbi = require("./ProposalTimeABI.json"); // Replace with your ABI file
const contractAddress = "0x9F2289B7fd89907777C7D552A84EfF0D319727f2";
async function addItems(itemid,quantity,address,nodeurl) {
  try {
    // // Fetch default node URLs from MongoDB
    // await connectToMongoDB();
    // const defaultNodes = await DefaultNode.find();
    // mongoose.disconnect();

    // if (defaultNodes.length === 0) {
    //   console.error("No default nodes found in MongoDB.");
    //   return;
    // }

    
  
      const web3 = new Web3("http://localhost:8504");
      const contract = new web3.eth.Contract(contractAbi, contractAddress);
      
      // Check if the sealer is authorized to add
      const isAuthorized = await contract.methods
        .nodes(address)
        .call();
      if (!isAuthorized.canPropose || !isAuthorized.isActive) {
        console.log("The adress is not authorized to add items.");
        return;
      }

      if (isAuthorized.canPropose && isAuthorized.isActive) {
    

        try {

          
          await contract.methods
            .addItem(itemid, quantity)
            .send({ from: address });
          console.log(
            `Added items to the blockchain ${address}`
          );

     
          

          // // Add the proposed node to the smart contract
          // await contract.methods.addNode(sealerAddressToApprove, true).send({ from: node1Address });
          // console.log(`Node added to the smart contract: ${sealerAddressToApprove}`);
        } catch (error) {
          console.error(`Error adding Items from ${address}:`, error.message);
        }
      } else {
        console.log(
          "there was an error"
        );
      }
    ;

  
  } finally {
   console.log("Succesful operation");
  }
}

const address="0x11459dB833C68c7852D126d4907a9a49150126fE"
const nodeurl="http://localhost:8504"
addItems(1,2,address,nodeurl);
