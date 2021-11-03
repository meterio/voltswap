import { Currency, ETHER, Token } from 'voltswap-sdk';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import EthereumLogo from '../../assets/images/ethereum-logo.png';
import useHttpLocations from '../../hooks/useHttpLocations';
import { WrappedTokenInfo } from '../../state/lists/hooks';
import Logo from '../Logo';
import web3 from 'web3';
import { tokens } from '../../constants/swap_tokens_list.json';

const getTokenLogoURL = (address: string, symbol: string | undefined) => {
  const parsedList = JSON.parse(JSON.stringify(tokens));
  symbol = symbol === 'MTR' ? 'MTRG' : symbol;

  let logoURI = `https://raw.githubusercontent.com/meterio/token-list/master/data/${symbol}/logo.png`;
  parsedList.map((token_data: any) => {
    logoURI =
      web3.utils.toChecksumAddress(token_data.address) === web3.utils.toChecksumAddress(address)
        ? token_data.logoURI
        : logoURI;
  });

  return logoURI;
};

const StyledEthereumLogo = styled.img<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  border-radius: 24px;
`;

const StyledLogo = styled(Logo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
  background: #eee;
  padding-top: 1px;
  margin-right: 3px;
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
`;

export default function CurrencyLogo({
  currency,
  size = '24px',
  style
}: {
  currency?: Currency;
  size?: string;
  style?: React.CSSProperties;
}) {
  const uriLocations = useHttpLocations(currency instanceof WrappedTokenInfo ? currency.logoURI : undefined);

  const srcs: string[] = useMemo(() => {
    if (currency?.symbol ===  ETHER.symbol) return [];

    if (currency instanceof Token) {
      if (currency instanceof WrappedTokenInfo) {
        return [...uriLocations, getTokenLogoURL(currency.address, currency.symbol)];
      }

      return [getTokenLogoURL(currency.address, currency.symbol)];
    }
    return [];
  }, [currency, uriLocations]);

  if (currency?.symbol === ETHER.symbol) {
    return <StyledEthereumLogo src={'https://raw.githubusercontent.com/meterio/token-list/master/data/TFUEL/logo.png'} size={size} style={style} />;
  }

  return <StyledLogo size={size} srcs={srcs} alt={`${currency?.symbol ?? 'token'} logo`} style={style} />;
}
