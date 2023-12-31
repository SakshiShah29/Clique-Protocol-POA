const { connectToMongoDB, Sealer, DefaultNode } = require("../setupMongoDB");
const axios = require("axios");
const Web3 = require("web3");
require("dotenv").config();
const CryptoJS = require("crypto-js");
const contractAbi = require("../ProposalTimeABI.json");
const { default: mongoose } = require("mongoose");
const contractAddress = process.env.CONTRACT_ADDRESS;
const parentNodeAddress = process.env.NODE1_ADDRESS;
const secretKey = process.env.SECRET_KEY;
async function proposeAndStoreApprovedSealer(req, res) {
  console.log("Request:", req.body);
  const sealerAddressToApprove = req.body.sealerAddressToApprove;
  const sealerNodeUrl = req.body.nodeUrl;
  try {
    // Fetch default node URLs from MongoDB
    await connectToMongoDB();
    const defaultNodes = await DefaultNode.find();
    mongoose.disconnect();

    if (defaultNodes.length === 0) {
      console.error("No default nodes found in MongoDB.");
      return res
        .status(500)
        .json({ error: "No default nodes found in MongoDB." });
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
      const decryptedSealerAddress = CryptoJS.AES.decrypt(defaultNode.address, secretKey).toString(CryptoJS.enc.Utf8);

      // Check if the sealer is authorized to propose
      const isAuthorized = await contract.methods
        .nodes(decryptedSealerAddress)
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
          // Start the proposal duration for the authorized node

          const response = await axios.post(defaultNode.nodeUrl, rpcData);
          console.log(
            `Proposal response from ${defaultNode.nodeUrl}:`,
            response.data.result
          );
          return response.data.result;
        } catch (error) {
          console.error(
            `Error proposing on node ${defaultNode.nodeUrl}:`,
            error.message
          );
        }
      } else {
        console.log("The node is not authorized to propose!");
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
      const web3 = new Web3("http://localhost:8501");
      const contract = new web3.eth.Contract(contractAbi, contractAddress);
      const addingNode = await contract.methods
        .addNode(sealerAddressToApprove, true)
        .send({ from: parentNodeAddress });
      console.log(addingNode);
      console.log(
        `${sealerAddressToApprove} added by Parent node in the blockchain!`
      );

       
      // Encrypt the sealer address before storing it
      const encryptedSealerAddress = CryptoJS.AES.encrypt(sealerAddressToApprove, secretKey).toString();

      await connectToMongoDB();
      // Add the new node to MongoDB
      const newSealer = new Sealer({
        address: encryptedSealerAddress,
        approved: true,
      });

      const savedSealer = await newSealer.save();
      console.log("Sealer stored in MongoDB Atlas:", savedSealer);

      // Add the new node as a default node
      const defaultNode = new DefaultNode({
        address: encryptedSealerAddress,
        nodeUrl: sealerNodeUrl,
      });

      const defaultnodeToadd = await defaultNode.save();
      console.log("Default node stored in MongoDB Atlas:", defaultnodeToadd);
      res.status(200).json({ message: "Sealer proposal successful" });
    } else {
      console.log("Sealer proposal was not approved by all nodes.");
      res
        .status(500)
        .json({ error: "Sealer proposal was not approved by all nodes." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  proposeAndStoreApprovedSealer,
};
