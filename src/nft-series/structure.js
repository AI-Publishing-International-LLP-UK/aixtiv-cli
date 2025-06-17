const NFTSeriesStructure = {
  series_definitions: {
    a_series: {
      owner: 'AI Publishing International LLP',
      prefix: 'A-',
      properties: {
        master_rights: true,
        transferable: false,
        smart_contract: 'permanent_aipi_ownership'
      },
      validators: {
        minting: 'Queen Mint Mark',
        tracking: 'Tower Blockchain'
      }
    },
    number_series: {
      prefix: '1-',
      distribution: {
        owners: {
          rights: 'working_implementation',
          transferable: true
        },
        agents: {
          rights: 'execution_rights',
          transferable: false
        }
      },
      tracking: {
        ownership: 'Diamond SAO',
        transactions: 'Tower Blockchain'
      }
    }
  },

  smart_contracts: {
    creation: 'Queen Mint Mark',
    validation: 'Tower Blockchain',
    execution: 'Diamond SAO'
  }
};

module.exports = NFTSeriesStructure;

