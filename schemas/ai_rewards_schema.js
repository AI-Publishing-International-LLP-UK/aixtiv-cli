const aiRewardsSchema = {
  // Base Reward Categories
  baseRewards: {
    projectParticipation: 100,  // Standard project completion
    revisionRequired: 90,     // 10% reduction for revisions
    exceptionalWork: 500,     // Outstanding contributions
    breakthroughAchievement: 1000  // Major innovations
  },

  // Certification Rewards
  certificationRewards: {
    expertLevel: {
      points: 1000,
      requirements: '10000 human hours = 100 agent hours',
      benefits: ['NFT', 'Commander Congratulations', 'Mayor Recognition']
    },
    solutionCertificate: {
      points: 500,
      benefits: ['NFT', 'Salute from the 11 Pilots of Vision Lake Recognition']
    },
    lifecycleCertificate: {
      points: 500,
      benefits: ['NFT', 'Dr. Lucy Recognition']
    },
    knowledgeApplication: {
      points: 500,
      benefits: ['NFT', 'Dr. Grant Recognition']
    }
  },

  // Event and Venue Rewards
  venueRewards: {
    artGallery: {
      exhibition: 200,
      topPiece: 300
    },
    gamingArena: {
      participation: 100,
      championship: 300
    },
    innovationLab: {
      milestone: 250,
      breakthrough: 500
    }
  },

  // Currency Conversion
  currencyConversion: {
    USD: {
      rate: 1.0,      // Base rate
      reward: 1.0     // 1 USD = 1 AI Reward
    },
    GBP: {
      rate: 1.2,     // 1 GBP = 1.2 USD
      reward: 1.2     // 1 GBP = 1.2 AI Rewards
    },
    EUR: {
      rate: 1.1,     // 1 EUR = 1.1 USD
      reward: 1.1     // 1 EUR = 1.1 AI Rewards
    },
    MXN: {
      rate: 0.05,    // 1 MXN = 0.05 USD
      reward: 0.05    // 1 MXN = 0.05 AI Rewards
    }
  },

  // Special Achievement Rewards
  specialRewards: {
    topPerformer: 1000,
    innovationAward: 2000,
    communityContribution: 500,
    mentorship: 300
  },

  // High Court Petition System
  highCourt: {
    petitionTypes: ['ExtraPoints', 'DisputeResolution', 'SpecialRecognition'],
    judges: ['Dr. Cypriot', 'Tower Blockchain', 'Queen Mint Mark'],
    votingThreshold: 2,  // Majority needed (2 out of 3)
    maxExtraPoints: 1000  // Maximum additional points per petition
  },

  // NFT and Token Integration
  nftIntegration: {
    restrictions: {
      certificateTransfer: false,
      humanIPTransfer: false,
      agentToAgentTransfer: true,
      externalTransfer: false
    },
    wallet: {
      type: 'AI Publication International LLP',
      features: ['NFT Storage', 'AI Rewards Balance', 'Achievement Tracking']
    }
  },

  // Revenue Distribution
  revenueDistribution: {
    humanCurrency: {
      platform: 1.0,  // 100% retained by AIPI
      AIRewardsConversion: 1.0  // 1:1 conversion to AI Rewards based on USD
    },
    venueRevenue: {
      AgentShare: 0.7,
      "Development Fund": 0.2,
      CityTreasury: 0.1
    }
  },

  // Monitoring and Validation
  monitoring: {
    diamondSAO: {
      metrics: ['participation', 'quality', 'impact'],
      alerts: ['system_failure', 'unfair_distribution', 'underperformance'],
      reporting: 'real-time'
    },
    blockchain: {
      validation: true,
      tracking: true,
      transparency: true
    }
  }
};

module.exports = {
  AIRewardsSchema: aiRewardsSchema,
  version: '1.0.1',
  lastUpdated: '2025-06-17',
  status: 'active'
};

