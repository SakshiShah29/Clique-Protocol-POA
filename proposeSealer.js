const { connectToMongoDB, Sealer, DefaultNode } = require("./setupMongoDB");
const { default: mongoose } = require("mongoose");
const axios = require("axios");
const Web3 = require("web3");

async function getCurrentTimestamp() {
  // Get the current timestamp in seconds
  const currentTimestamp = Date.now();
  console.log(currentTimestamp)
  return currentTimestamp;
}

const contractAbi = require("./ProposalTimeABI.json"); // Replace with your ABI file
const contractAddress = "0x8Ada3ea70b022040FeD256F3184C60b07EddA31b";
async function proposeAndStoreApprovedSealer(sealerAddressToApprove) {
  try {
    // Fetch default node URLs from MongoDB
    await connectToMongoDB();
    const defaultNodes = await DefaultNode.find();
    mongoose.disconnect();

    if (defaultNodes.length === 0) {
      console.error("No default nodes found in MongoDB.");
      return;
    }

    // Use axios to make JSON-RPC calls to all nodes to propose the new sealer
    const rpcCalls = defaultNodes.map(async (defaultNode) => {
      const web3 = new Web3(defaultNode.nodeUrl);
      const contract = new web3.eth.Contract(contractAbi, contractAddress);
      // Check if it's the proposal time
      const isProposalTime = await contract.methods.isProposalTime().call();
      if (!isProposalTime) {
        console.log("The proposal time has not started yet.");
        return;
      }

      // Check if the sealer is authorized to propose
      const isAuthorized = await contract.methods
        .nodes(defaultNode.address)
        .call();
      if (!isAuthorized.canPropose) {
        console.log("The sealer is not authorized to propose.");
        return;
      }

      if (isAuthorized.canPropose) {
        const rpcData = {
          jsonrpc: "2.0",
          method: "clique_propose",
          params: [sealerAddressToApprove, true],
          id: 1,
        };

        try {

          const currentTimestamp = await getCurrentTimestamp();
          // Start the proposal duration for the authorized node
          await contract.methods
            .startNodeProposalDuration(defaultNode.address, currentTimestamp)
            .send({ from: defaultNode.address });
          console.log(
            `Authorization and proposal duration started for ${defaultNode.address}`
          );

          const response = await axios.post(defaultNode.nodeUrl, rpcData);
          console.log(
            `Proposal response from ${defaultNode.nodeUrl}:`,
            response.data.result
          );
          return response.data.result;
          

          // // Add the proposed node to the smart contract
          // await contract.methods.addNode(sealerAddressToApprove, true).send({ from: node1Address });
          // console.log(`Node added to the smart contract: ${sealerAddressToApprove}`);
        } catch (error) {
          console.error(`Error proposing on node ${defaultNode.nodeUrl}:`, error.message);
        }
      } else {
        console.log(
          "The proposal time is over, you need to wait until proposal starts!"
        );
      }
    });

    // Wait for all proposal results
    const proposalResults = await Promise.all(rpcCalls);
    console.log("Proposal results:", proposalResults);

    // Check if the proposal was approved by all nodes
    const isApprovedByAllNodes = proposalResults.every(
      (result) => result === null
    );

    if (isApprovedByAllNodes) {
      await connectToMongoDB();

      // Add the new node to MongoDB
      const newSealer = new Sealer({
        address: sealerAddressToApprove,
        approved: true,
      });

      const savedSealer = await newSealer.save();
      console.log("Sealer stored in MongoDB Atlas:", savedSealer);

      // Add the new node as a default node
      const defaultNode = new DefaultNode({
        address: sealerAddressToApprove,

        nodeUrl: "http://localhost:8504",
      });

      const defaultnodeToadd = await defaultNode.save();
      console.log("default node stored in MongoDB Atlas:", defaultnodeToadd);
    } else {
      console.log("Sealer proposal was not approved by all nodes.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
}

const sealerAddressToApprove = "0x11459dB833C68c7852D126d4907a9a49150126fE";
proposeAndStoreApprovedSealer(sealerAddressToApprove);
