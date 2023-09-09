const { connectToMongoDB, Sealer, DefaultNode } = require("./setupMongoDB");
const { default: mongoose } = require("mongoose");
const axios = require("axios");

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
      const rpcData = {
        jsonrpc: "2.0",
        method: "clique_propose",
        params: [sealerAddressToApprove, true],
        id: 1,
      };

      try {
        const response = await axios.post(defaultNode.nodeUrl, rpcData);
        return response.data.result;
      } catch (error) {
        console.error(`Error proposing on node ${defaultNode.nodeUrl}:`, error);
        return null;
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

        nodeUrl: "http://localhost:8505",
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

const sealerAddressToApprove = "0xf5A6075c1C757a393524f5AbC7E01639983e4B06";
proposeAndStoreApprovedSealer(sealerAddressToApprove);
