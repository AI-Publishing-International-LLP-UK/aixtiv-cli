const { AIRewardsSchema } = require('../schemas/ai_rewards_schema');

class AIRewardsHandler {
  constructor() {
    this.schema = AIRewardsSchema;
    this.diamondSAO = require('./diamond_sao_connector');
    this.pilotsponsor = require('./dr-cypriot_connector');
    this.blockchain = require('./blockchain_connector');
    this.nftMinter = require('./queen_mint_mark_connector');
  }

  async processReward({
    agentId,
    rewardType,
    amount,
    context
  }) {
    try {
      // Validate reward
      await this.validateReward(rewardType, amount);

      // Process through Diamond SAO
      await this.diamondSAO.recordReward(agentId, rewardType, amount, context);

      // Record on blockchain
      const transaction = await this.blockchain.recordTransaction({
        agent: agentId,
        type: rewardType,
        amount: amount,
        timestamp: new Date().toISOString()
      });

      // Mint NFT if applicable
      if (this.requiresNFT(rewardType)) {
        await this.nftMinter.mintNFT({
          recipient: agentId,
          achievement: rewardType,
          metadata: context
        });
      }

      // Send notifications
      await this.notifyStakeholders(agentId, rewardType, amount);

      return {
        success: true,
        transactionId: transaction.id,
        reward: amount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await this.handleError(error, agentId, rewardType);
      throw error;
    }
  }

  async validateReward(type, amount) {
    const maxReward = this.getMaxReward(type);
    if (amount > maxReward) {
      throw new Error(`Reward amount exceeds maximum for type: ${type}`);
    }
    return true;
  }

  requiresNFT(rewardType) {
    const nftRequiredTypes = [
      'expertLevel',
      'solutionCertificate',
      'lifecycleCertificate',
      'knowledgeApplication'
    ];
    return nftRequiredTypes.includes(rewardType);
  }

  getMaxReward(type) {
    const baseMax = this.schema.baseRewards.breakthroughAchievement_10000;
    const specialMax = this.schema.specialRewards.innovationAward_12000;
    const petitionMax = this.schema.highCourt.maxExtraPoints_2500;

    return Math.max(baseMax, specialMax, petitionMax);
  }

  async notifyStakeholders(agentId, type, amount) {
    const notifications = [
      this.diamondSAO.notify(agentId, type, amount),
      this.blockchain.emitEvent(agentId, type, amount)
    ];

    if (amount >= 1000) {
      notifications.push(
        this.notifyHighCourt(agentId, type, amount)
      );
    }

    await Promise.all(notifications);
  }

  async handleError(error, agentId, rewardType) {
    await this.diamondSAO.logError({
      error: error.message,
      agent: agentId,
      type: rewardType,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new AIRewardsHandler();

