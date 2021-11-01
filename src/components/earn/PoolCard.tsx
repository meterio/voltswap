import React, { useEffect, useState } from 'react';
import { Currency, Token } from 'voltswap-sdk';
import { formatUnits } from '@ethersproject/units';
import { AutoColumn } from '../Column';
import { RowBetween } from '../Row';
import styled from 'styled-components';
import { useActiveWeb3React } from '../../hooks';
import { TYPE, ExternalLink } from '../../theme';
import { ButtonPrimary } from '../Button';
import { CardNoise, CardBGImage } from './styled';
import { getCurrentPrice } from './price';
import DoubleCurrencyLogo from '../DoubleLogo';
import { unwrappedToken } from '../../utils/wrappedCurrency';
import BigNumber from 'bignumber.js';
import { getERC20Contract, getGeyserContract, getPairContract } from '../../utils';
import { Contract } from '@ethersproject/contracts';
import { TokenPair } from '../../pages/Earn/types';
import { Web3Provider } from '@ethersproject/providers';
const MS_PER_SEC = 1000;
const YEAR_IN_SEC = 12 * 30 * 24 * 3600;

// polling interval for querying subgraph

const POLL_INTERVAL = 30 * MS_PER_SEC;

enum GeyserStatus {
  ONLINE = 'Online',
  OFFLINE = 'Offline',
  SHUTDOWN = 'Shutdown'
}

type RewardSchedule = {
  id: string;
  duration: string;
  start: string;
  rewardAmount: string;
};

type Geyser = {
  id: string;
  rewardToken: string;
  stakingToken: string;
  totalStake: string;
  totalStakeUnits: string;
  status: GeyserStatus;
  scalingFloor: string;
  scalingCeiling: string;
  scalingTime: string;
  unlockedReward: string;
  rewardSchedules: RewardSchedule[];
  lastUpdate: string;
};
export const DAY_IN_SEC = 24 * 3600;

const StatContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1rem;
  margin-right: 1rem;
  margin-left: 1rem;
`;

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  border-radius: 12px;
  width: 100%;
  overflow: hidden;
  position: relative;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '1')};
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%, ${showBackground ? theme.black : theme.bg5} 100%) `};
  color: ${({ theme, showBackground }) => (showBackground ? theme.white : theme.text1)} !important;
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`;

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 120px;
  grid-gap: 0px;
  align-items: center;
  padding: 1rem;
  z-index: 1;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 48px 1fr 96px;
  `};
`;

// const APR = styled.div`
//   display: flex;
//   justify-content: flex-end;
// `

const BottomSection = styled.div<{ showBackground: boolean }>`
  padding: 12px 16px;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '0.4')};
  border-radius: 0 0 12px 12px;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  z-index: 1;
`;
const activeClassName = 'ACTIVE';

const StyledExternalLink = styled(ExternalLink).attrs({
  activeClassName
})<{ isActive?: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  position: absolute;
  right: 0px;
  padding: 10px;
  color: ${({ theme }) => theme.text2};
  font-size: 1rem;
  width: fit-content;
  margin: 0 12px;
  font-weight: 500;
`;
const nowInSeconds = () => Math.round(Date.now() / 1000);

const getGeyserDuration = (geyser: Geyser) => {
  const now = nowInSeconds();
  const { rewardSchedules } = geyser;
  const schedulesEndTime = rewardSchedules.map(
    schedule => parseInt(schedule.start, 10) + parseInt(schedule.duration, 10)
  );
  return Math.max(...schedulesEndTime.map(endTime => endTime - now), 0);
};

const getCalcPeriod = (geyser: Geyser) => {
  const { scalingTime, rewardSchedules } = geyser;
  const now = nowInSeconds();
  const schedulesEndTime = rewardSchedules.map(
    schedule => parseInt(schedule.start, 10) + parseInt(schedule.duration, 10)
  );
  const geyserDuration = Math.max(...schedulesEndTime.map(endTime => endTime - now), 0);
  return Math.max(Math.min(geyserDuration, parseInt(scalingTime, 10)), DAY_IN_SEC);
};
/**
 * Returns the amount of reward token that will be unlocked between now and `end`
 */
export const getStakeDrip = async (geyser: Geyser, stake: BigNumber, duration: number, contract: Contract) => {
  const now = nowInSeconds();
  const afterDuration = now + duration;
  const futureReward = await contract.getFutureUnlockedRewards(afterDuration);
  const currentReward = await contract.getCurrentUnlockedRewards();
  const poolDrip = futureReward - currentReward;
  const stakeUnitsFromStake = stake.times(duration);
  const geyserData = await contract.getGeyserData();
  const { lastUpdate, totalStake, totalStakeUnits } = geyserData;
  const durationSinceLastUpdate = Math.max(afterDuration - lastUpdate, 0);
  // console.log('stake:', stake.toString());
  // console.log('total stake units:', totalStakeUnits.toString());
  // console.log('total stake:', totalStake.toString());
  // console.log('duration since last update:', durationSinceLastUpdate);
  // console.log('stake units from stake:', stakeUnitsFromStake.toString());
  const totalStakeUnitsAfterDuration = new BigNumber(totalStakeUnits.toString()).plus(
    new BigNumber(totalStake.toString()).times(durationSinceLastUpdate)
  );
  // console.log('total stake units after duration:', totalStakeUnitsAfterDuration.toString());

  if (totalStakeUnitsAfterDuration.isZero()) return 0;
  // console.log('pool drip:', poolDrip);
  return new BigNumber(poolDrip)
    .times(stakeUnitsFromStake)
    .div(totalStakeUnitsAfterDuration.plus(stakeUnitsFromStake))
    .div(new BigNumber(1e9))
    .toNumber();
};

const calculateAPY = (inflow: number, outflow: number, periods: number) => (outflow * YEAR_IN_SEC) / inflow / periods;

/**
 * Pool APY is the APY for a user who makes an average deposit at the current moment in time
 */
const getPoolAPY = async (
  geyser: Geyser,
  stakingTokenPrice: number,
  stakingTokenDecimals: number,
  rewardTokenPrice: number,
  rewardTokenDecimals: number,
  library: Web3Provider
) => {
  const { scalingTime } = geyser;

  const inflow = 20000.0; // avg_deposit: 20,000 USD
  const inflowDecimals = new BigNumber((10 ** stakingTokenDecimals).toString());
  const inflowFixedPt = new BigNumber(inflow).times(inflowDecimals);
  const stakeTokenPriceBigNum = new BigNumber(Math.round(stakingTokenPrice));
  // console.log('stake token price: ', stakeTokenPriceBigNum.toString());
  // console.log('inflow fixed pt:', inflowFixedPt.toString());
  const stake = inflowFixedPt.div(stakeTokenPriceBigNum);
  // console.log('stake: ', stake.toString());
  const calcPeriod = getCalcPeriod(geyser);
  const contract = getGeyserContract(geyser.id, library);

  // console.log('scaling time: ', scalingTime);
  const stakeDripAfterPeriod = await getStakeDrip(geyser, stake, parseInt(scalingTime, 10), contract);
  // console.log('stake drip after period:', stakeDripAfterPeriod);
  if (stakeDripAfterPeriod === 0) return 0;

  const outflow = parseFloat(formatUnits(Math.round(stakeDripAfterPeriod), rewardTokenDecimals)) * rewardTokenPrice;
  // const periods = YEAR_IN_SEC / calcPeriod;
  // console.log('inflow: ', inflow);
  // console.log('outflow: ', outflow * 1e9);

  return calculateAPY(inflow, outflow * 1e9, calcPeriod);
};

export default function PoolCard({ geyserInfo, tokenPair }: { geyserInfo: Geyser; tokenPair: TokenPair }) {
  //console.log(geyserInfo)

  const { library, chainId } = useActiveWeb3React();
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState('');
  const [stakingTokenPrice, setStakingTokenPrice] = useState(1);
  const [rewardTokenSymbol, setRewardTokenSymbol] = useState('');
  const [rewardTokenPrice, setRewardTokenPrice] = useState(1);
  const [totalDeposit, setTotalDeposit] = useState(new BigNumber(0));
  const [geyserAPY, setGeyserAPY] = useState(0);
  const [currency0, setCurrency0] = useState<Currency>();
  const [currency1, setCurrency1] = useState<Currency>();

  const durationInDay = getGeyserDuration(geyserInfo) / DAY_IN_SEC;
  const totalStake = new BigNumber(geyserInfo.totalStake).dividedBy(1e18);
  const isVoltPool = geyserInfo.id.toLowerCase() === "0xBfC69a757Dd7DB8C59e10c63aB023dc8c8cc95Dc".toLowerCase()
  useEffect(() => {
    (async () => {
      try {
        if (library) {
          const stakingSymbol = isVoltPool ? tokenPair.token0.symbol:  `${tokenPair.token0.symbol}-${tokenPair.token1.symbol}`;
          setStakingTokenSymbol(stakingSymbol);
           
          let uniPrice = 0
          if (isVoltPool) {
            console.log(geyserInfo.stakingToken)
            const mtrgPrice_st = await getCurrentPrice('MTRG');
            const mtrgVoltPair_st = getPairContract('0x1071392e4cdf7c01d433b87be92beb1f8fd663a8', library);
            const { reserve0, reserve1 } = await mtrgVoltPair_st.getReserves();
         
            uniPrice = new BigNumber(mtrgPrice_st)
              .times(reserve0.toString())
              .div(reserve1.toString())
              .toNumber();
               
          } else {
            uniPrice = parseFloat( tokenPair.reserveUSD) / parseFloat(tokenPair.totalSupply);
          }
         

         
          setStakingTokenPrice(uniPrice);
          const rewardToken = getERC20Contract(geyserInfo.rewardToken, library);

          const rewardSymbol = await rewardToken.symbol();

          setRewardTokenSymbol(rewardSymbol);

          if (isVoltPool) {
            setCurrency0(
              unwrappedToken(
                new Token(82, tokenPair.token0.id, Number(tokenPair.token0.decimals), tokenPair.token0.symbol)
              )
            );
            
          }else{
            setCurrency0(
              unwrappedToken(
                new Token(82, tokenPair.token0.id, Number(tokenPair.token0.decimals), tokenPair.token0.symbol)
              )
            );
            setCurrency1(
              unwrappedToken(
                new Token(82, tokenPair.token1.id, Number(tokenPair.token1.decimals), tokenPair.token1.symbol)
              )
            );
          }
         

          let voltPrice = 0;
          if (rewardSymbol === 'VOLT') {
            const mtrgPrice = await getCurrentPrice('MTRG');
            const mtrgVoltPair = getPairContract('0x1071392e4cdf7c01d433b87be92beb1f8fd663a8', library);
            const { reserve0, reserve1 } = await mtrgVoltPair.getReserves();
            // console.log('mtrg price:', mtrgPrice);
            // console.log('mtrg amount:', reserve0.toString());
            // console.log('volt amount:', reserve1.toString());
            voltPrice = new BigNumber(mtrgPrice)
              .times(reserve0.toString())
              .div(reserve1.toString())
              .toNumber();
          } else {
            voltPrice = await getCurrentPrice(rewardSymbol);
          }
          // console.log('VOLT price: ', voltPrice);
          setRewardTokenPrice(voltPrice);
          
          setTotalDeposit(totalStake.times(uniPrice));
         
          // console.log(`Geyser  ${stakingSymbol} -- ${rewardSymbol}`);
          // console.log(`staking ${stakingSymbol} price ${uniPrice}`);
          // console.log(`reward ${rewardSymbol} price ${voltPrice}`);
          // console.log('total stake:', totalStake.toFixed(2));
          if (isVoltPool) {
           
            const apy = await getPoolAPY(geyserInfo, (uniPrice + voltPrice) , 18, voltPrice, 18, library);
          // console.log(`apy: ${(apy * 100).toFixed(2)}%`);
          // console.log('-'.repeat(40));
          setGeyserAPY(apy);

          }else{
          const apy = await getPoolAPY(geyserInfo, uniPrice, 18, voltPrice, 18, library);
          // console.log(`apy: ${(apy * 100).toFixed(2)}%`);
          // console.log('-'.repeat(40));
          setGeyserAPY(apy);
          }
          
        
        }
      } catch (e) {
        console.log('Error happened:', e);
      }
    })();
  }, [library]);

  //console.log(apy.toSignificant(4, { groupSeparator: ',' }))

  return (
    <Wrapper showBackground={true} bgColor={'#2172E5'}>
      <CardBGImage desaturate />
      <CardNoise />
      <TopSection>
        <DoubleCurrencyLogo currency0={currency0} currency1={currency1} size={30} />

        <TYPE.white fontWeight={400} fontSize={24} style={{ marginLeft: '20px' }}>
          {stakingTokenSymbol}
        </TYPE.white>
        {
          isVoltPool ?
          <StyledExternalLink
          href={`https://farm.voltswap.finance?farm=${tokenPair.token0.symbol}`}
        >
          <ButtonPrimary padding="8px" borderRadius="8px">
            Detail <span style={{ fontSize: '11px' }}>↗</span>
          </ButtonPrimary>
        </StyledExternalLink>:
        <StyledExternalLink
        href={`https://farm.voltswap.finance?farm=${tokenPair.token0.symbol}-${tokenPair.token1.symbol}`}
      >
        <ButtonPrimary padding="8px" borderRadius="8px">
          Detail <span style={{ fontSize: '11px' }}>↗</span>
        </ButtonPrimary>
      </StyledExternalLink>
        }

      </TopSection>

      <StatContainer>
        <RowBetween>
          <TYPE.white> Total staked value</TYPE.white>
          <TYPE.white>{totalDeposit.isGreaterThan(0) ? totalDeposit.toFixed(2) : '--.--'} USD</TYPE.white>
        </RowBetween>

        <RowBetween>
          <TYPE.white>Ends In</TYPE.white>
          <TYPE.white>{durationInDay > 0 ? durationInDay.toFixed(2) : '--'} Days</TYPE.white>
        </RowBetween>

        <RowBetween>
          <TYPE.white> Estimated APY </TYPE.white>
          <TYPE.white>{geyserAPY > 0 ? (geyserAPY * 100).toFixed(2) : '-.--'} %</TYPE.white>
        </RowBetween>
      </StatContainer>

      {/* {isStaking && (
        <>
          <Break />
          <BottomSection showBackground={true}>
            <TYPE.black color={'white'} fontWeight={500}>
              <span>Your rate</span>
            </TYPE.black>
            <TYPE.black style={{ textAlign: 'right' }} color={'white'} fontWeight={500}>
              <span role="img" aria-label="wizard-icon" style={{ marginRight: '0.5rem' }}>
              </span>
              {`${stakingInfo.rewardRate
                ?.multiply(`${60 * 60 * 24 * 7}`)
                ?.toSignificant(4, { groupSeparator: ',' })} MTRG / week`}
            </TYPE.black>
          </BottomSection>
        </>
      )} */}
    </Wrapper>
  );
}
