import { ChainId, Token } from 'meterswap-sdk'

import {tokens} from './swap_tokens_list.json'
var parsedList = JSON.parse(JSON.stringify(tokens));


 



export const MeterTokens: { [chainId in ChainId]: { [address: string]: Token } } = {

  

  [ChainId.METER]: {

   

    '0x687A6294D0D6d63e751A059bf1ca68E4AE7B13E2': new Token(
      ChainId.METER,
      '0x687A6294D0D6d63e751A059bf1ca68E4AE7B13E2',
      18,
      'MTR',
      'MTR'
    ),
    '0x228ebBeE999c6a7ad74A6130E81b12f9Fe237Ba3': new Token(
      ChainId.METER,
      '0x228ebBeE999c6a7ad74A6130E81b12f9Fe237Ba3',
      18,
      'MTRG',
      'MTRG'
    ),
    '0xd86e243fc0007e6226b07c9a50c9d70d78299eb5': new Token(
      ChainId.METER,
      '0xd86e243fc0007e6226b07c9a50c9d70d78299eb5',
      6,
      'USDC.eth',
      'USDC.eth'
    ),
    '0x5Fa41671c48e3C951AfC30816947126CCC8C162e': new Token(
      ChainId.METER,
      '0x5Fa41671c48e3C951AfC30816947126CCC8C162e',
      6,
      'USDT.eth',
      'USDT.eth'
    ),
    '0x79A61D3A28F8c8537A3DF63092927cFa1150Fb3C': new Token(
      ChainId.METER,
      '0x79A61D3A28F8c8537A3DF63092927cFa1150Fb3C',
      18,
      'WETH.eth',
      'WETH.eth'
    ),
    '0x093Dc064D9E7b7558241E014bAE631F02f684146': new Token(
      ChainId.METER,
      '0x093Dc064D9E7b7558241E014bAE631F02f684146',
      18,
      'WBTC.eth',
      'WBTC.eth'
    ),
  
///from here

   

  },

  [ChainId.MAINNET]: {},
  [ChainId.RINKEBY]: {
    '0xBeE85b7b676f9306803B6DFC09F024c30a7A2a1e': new Token(
      ChainId.RINKEBY,
      '0xBeE85b7b676f9306803B6DFC09F024c30a7A2a1e',
      18,
      'EMTR',
      'EMTR'
    ),
    '0x4f6d94accf73713968f6d1b3d191a05762bfd2c1': new Token(
      ChainId.RINKEBY,
      '0x4f6d94accf73713968f6d1b3d191a05762bfd2c1',
      18,
      'EMTRG',
      'EMTRG'
    )
  },
  [ChainId.ROPSTEN]: {},
  [ChainId.KOVAN]: {},
  [ChainId.GÖRLI]: {}
}
